"""AI integration for the chat system.

Responsibilities:

- Build the prompt from the chat history.
- Decide whether the AI's reply is a regular answer or a summary that
  the user must confirm before a ticket is created.
- Expose a streaming generator the HTTP layer can forward to the client
  (SSE / WebSocket).

The underlying model (``watsonx_client``) does not itself stream, so we
generate the full text once and then yield it in small chunks. Swapping
in a real streaming client later only requires changing :func:`stream`.
"""

from __future__ import annotations

import re
import time
from collections.abc import Iterable, Iterator
from dataclasses import dataclass

from models.chat import (
    AI_ANSWER_NORMAL,
    AI_ANSWER_SUMMARY,
    SENDER_AI,
    SENDER_USER,
    Message,
)
from watsonx_client import watsonx_client

# Marker the model is asked to prefix when it produces a summary.
# Detected case-insensitively; stripped before persisting/streaming.
_SUMMARY_PREFIX = "[SUMMARY]"
_SUMMARY_RE = re.compile(r"^\s*\[summary\]\s*", re.IGNORECASE)

# Heuristic keywords that promote the next AI reply to a summary in
# MOCK_MODE (and as a soft hint in real mode through the system prompt).
_SUMMARY_TRIGGERS = (
    "summary",
    "summarize",
    "summarise",
    "create ticket",
    "open ticket",
    "file ticket",
    "raise ticket",
)


@dataclass
class AIResponse:
    """Final, fully-assembled AI reply."""

    content: str
    answer_type: str  # AI_ANSWER_NORMAL | AI_ANSWER_SUMMARY


def _system_prompt() -> str:
    return (
        "You are a customer-support assistant inside a ticketing system. "
        "Have a normal helpful conversation with the user. When you have "
        "gathered enough information to open a support ticket, reply with a "
        "concise ticket summary and prefix that reply with the literal token "
        f"{_SUMMARY_PREFIX} on its own. Otherwise just answer normally."
    )


def _format_history(history: Iterable[Message]) -> str:
    lines = []
    for msg in history:
        role = "User" if msg.sender == SENDER_USER else "Assistant"
        lines.append(f"{role}: {msg.content}")
    return "\n".join(lines)


def _build_prompt(history: Iterable[Message], user_message: str) -> str:
    return (
        f"{_system_prompt()}\n\n"
        f"{_format_history(history)}\n"
        f"User: {user_message}\n"
        f"Assistant:"
    )


def _looks_like_summary_request(user_message: str) -> bool:
    text = user_message.lower()
    return any(trigger in text for trigger in _SUMMARY_TRIGGERS)


def _classify(raw: str, user_message: str) -> tuple[str, str]:
    """Return (cleaned_content, answer_type) from a raw model output."""
    if _SUMMARY_RE.match(raw):
        return _SUMMARY_RE.sub("", raw).strip(), AI_ANSWER_SUMMARY

    # MOCK_MODE / weak models often won't emit the marker. Fall back to a
    # keyword heuristic on the user's last turn so the confirmation flow
    # is still demonstrable end-to-end.
    if watsonx_client.mock_mode and _looks_like_summary_request(user_message):
        cleaned = raw.strip()
        return (
            f"Here's a draft ticket summary based on our conversation:\n{cleaned}",
            AI_ANSWER_SUMMARY,
        )
    return raw.strip(), AI_ANSWER_NORMAL


def generate(history: Iterable[Message], user_message: str) -> AIResponse:
    """Generate a full AI reply (no streaming)."""
    prompt = _build_prompt(history, user_message)
    raw = watsonx_client.generate(prompt) or ""
    content, answer_type = _classify(raw, user_message)
    return AIResponse(content=content, answer_type=answer_type)


def stream(
    history: Iterable[Message],
    user_message: str,
    chunk_size: int = 24,
    delay_seconds: float = 0.02,
) -> tuple[Iterator[str], "_FinalResponseHolder"]:
    """Stream the AI reply in chunks.

    Returns a ``(chunks, holder)`` tuple. The caller iterates ``chunks``
    to emit SSE events; once exhausted, ``holder.response`` contains the
    fully-assembled :class:`AIResponse` to persist.
    """
    response = generate(history, user_message)
    holder = _FinalResponseHolder(response=response)

    def _iter() -> Iterator[str]:
        text = response.content
        for i in range(0, len(text), chunk_size):
            yield text[i : i + chunk_size]
            if delay_seconds:
                time.sleep(delay_seconds)

    return _iter(), holder


@dataclass
class _FinalResponseHolder:
    response: AIResponse
