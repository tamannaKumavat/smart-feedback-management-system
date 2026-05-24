import { clearSession, getToken } from "./session";

const API_PREFIX = "/api";

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Handle 401 once, in one place: drop the stale session and bounce the
 * user to /login. This avoids leaving an expired token in storage where
 * ``RoleRoute`` would otherwise keep letting them onto protected pages.
 */
function handleUnauthorized() {
  clearSession();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

async function unwrap(res) {
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Your session has expired. Please log in again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data.detail || data.message || `Request failed (${res.status})`;
    throw new Error(
      typeof message === "string" ? message : JSON.stringify(message),
    );
  }
  return data;
}

async function getJson(path) {
  const res = await fetch(`${API_PREFIX}${path}`, {
    headers: { ...authHeaders() },
  });
  return unwrap(res);
}

async function postJson(path, body) {
  const res = await fetch(`${API_PREFIX}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  return unwrap(res);
}

async function deleteJson(path) {
  const res = await fetch(`${API_PREFIX}${path}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return unwrap(res);
}

export function createChat() {
  return postJson("/chats");
}

export function getMessages(chatId) {
  return getJson(`/chats/${chatId}/messages`);
}

export function confirmSummary(chatId, accepted) {
  return postJson("/confirm", { chatId, accepted });
}

export function listDrafts() {
  return getJson("/drafts");
}

export function deleteAllDrafts() {
  return deleteJson("/drafts");
}

export function resumeChat(chatId) {
  return postJson(`/chats/${chatId}/resume`);
}

/**
 * Mark a chat as draft. Uses ``keepalive`` so it still goes out when the
 * page is being unloaded (back/forward navigation, tab close).
 */
/**
 * Build a URL that an ``<img>`` or ``<a href>`` can use directly.
 *
 * Browsers can't set request headers on those tags, so the JWT is
 * appended as a ``?token=`` query string. The download endpoint
 * supports this fallback (header still wins when both are present).
 */
export function attachmentDownloadUrl(attachmentId) {
  const token = getToken();
  const base = `${API_PREFIX}/uploads/${attachmentId}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

export function listMyTickets() {
  return getJson("/tickets");
}

export function listMyIssues() {
  return getJson("/issues");
}

export function getTicket(ticketId) {
  return getJson(`/tickets/${ticketId}`);
}

/**
 * Upload a file/screenshot for a chat. Returns an attachment object
 * with an ``id`` that should be passed to ``sendMessageStream`` via
 * ``attachmentIds`` to link the file to the next user message.
 */
export async function uploadAttachment({ chatId, file }) {
  const form = new FormData();
  form.append("chatId", chatId);
  form.append("file", file);
  const res = await fetch(`${API_PREFIX}/uploads`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
  });
  const data = await unwrap(res);
  return data.attachment;
}

export function markChatAsDraft(chatId) {
  return fetch(`${API_PREFIX}/chats/${chatId}/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    keepalive: true,
  }).catch(() => {});
}

/**
 * Send a message and stream the AI reply.
 *
 * The backend emits Server-Sent Events of these shapes:
 *
 *   { type: "user_message", message: <MessageDTO> }
 *   { type: "token", content: "<chunk>" }
 *   { type: "done", chat: <ChatDTO>, aiMessage: <MessageDTO> }
 *   { type: "error", message: "<reason>" }
 *
 * The handlers receive parsed objects. Returns a promise that resolves
 * when the stream ends and rejects on transport / error events.
 */
export async function sendMessageStream(
  { chatId, content, attachmentIds = [] },
  { onUserMessage, onToken, onDone, onError, signal } = {},
) {
  const res = await fetch(`${API_PREFIX}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...authHeaders(),
    },
    body: JSON.stringify({ chatId, content, attachmentIds, stream: true }),
    signal,
  });

  if (res.status === 401) {
    handleUnauthorized();
    const err = new Error("Your session has expired. Please log in again.");
    onError?.(err);
    throw err;
  }

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    const message =
      data.detail || data.message || `Request failed (${res.status})`;
    const err = new Error(
      typeof message === "string" ? message : JSON.stringify(message),
    );
    onError?.(err);
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  function handleEvent(raw) {
    const lines = raw.split("\n");
    const dataLines = lines
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).replace(/^ /, ""));
    if (!dataLines.length) return;
    const json = dataLines.join("\n");
    let payload;
    try {
      payload = JSON.parse(json);
    } catch {
      return;
    }
    switch (payload.type) {
      case "user_message":
        onUserMessage?.(payload.message);
        break;
      case "token":
        onToken?.(payload.content);
        break;
      case "done":
        onDone?.(payload);
        break;
      case "error":
        onError?.(new Error(payload.message || "AI error"));
        break;
      default:
        break;
    }
  }

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sepIdx;
    while ((sepIdx = buffer.indexOf("\n\n")) >= 0) {
      const raw = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + 2);
      if (raw.trim()) handleEvent(raw);
    }
  }

  if (buffer.trim()) handleEvent(buffer);
}
