import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaRegShareFromSquare } from "react-icons/fa6";
import { FiPaperclip, FiPlus, FiSend, FiSmile, FiX } from "react-icons/fi";
import { useTranslation } from "@/i18n/useTranslation.js";
import MarkdownMessage from "../../components/MarkdownMessage.jsx";
import PortalLayout from "../../layouts/PortalLayout.jsx";
import {
  attachmentDownloadUrl,
  confirmSummary,
  createChat,
  getMessages,
  markChatAsDraft,
  resumeChat,
  uploadAttachment,
} from "../../lib/chatApi.js";
import { getToken } from "../../lib/session.js";
import { fadeInUp, messageBubble, scaleIn } from "../../lib/motion.js";
import { showError, showSuccess } from "../../lib/toast.js";

const MAX_UPLOAD_MB = 10;
const ALLOWED_PREFIXES = ["image/", "application/pdf", "text/"];

function isAllowedMime(mime) {
  if (!mime) return false;
  return ALLOWED_PREFIXES.some((p) => mime.startsWith(p));
}

function formatBytes(n) {
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const userAvatar = "/user.png";
const teamAvatar = "/ruag-single.png";

const SUGGESTED_PROMPT_KEYS = ["login", "draftHelp", "production", "summarize"];

const btnYes = "client-btn-option";
const btnNo = "client-btn-option-muted";
const scrollPretty =
  "[scrollbar-width:thin] [scrollbar-color:rgb(100_116_139/0.45)_transparent] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-input/60 hover:[&::-webkit-scrollbar-thumb]:bg-content-muted/50";

function formatTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatOptionLabel(option) {
  if (!option) return "";
  if (option === "Ok") return "Ok";
  return option
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function createLocalMessage({ sender, content, chatId, extra = {} }) {
  return {
    id: `${sender}-${Date.now()}`,
    chatId,
    sender,
    content,
    aiAnswerType: "normal",
    createdAt: new Date().toISOString(),
    attachments: [],
    ...extra,
  };
}

function normalizeMessageContent(content) {
  return String(content ?? "").replace(/\s+/g, " ").trim();
}

function AttachmentChip({ attachment }) {
  const href = attachmentDownloadUrl(attachment.id);
  const isImage = attachment.mimeType?.startsWith("image/");
  if (isImage) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-[260px] overflow-hidden rounded-lg border border-border-subtle bg-surface-muted"
      >
        <img
          src={href}
          alt={attachment.filename}
          className="block max-h-48 w-full object-cover"
          loading="lazy"
        />
        <div className="flex items-center justify-between gap-2 px-2 py-1 text-[11px] text-content-muted">
          <span className="truncate">{attachment.filename}</span>
          <span className="shrink-0">{formatBytes(attachment.sizeBytes)}</span>
        </div>
      </a>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border-subtle bg-surface-muted px-3 py-1.5 text-[12px] text-content hover:bg-surface-page"
    >
      <FiPaperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate font-medium">{attachment.filename}</span>
      <span className="shrink-0 text-content-muted">
        {formatBytes(attachment.sizeBytes)}
      </span>
    </a>
  );
}

function Avatar({ src, label }) {
  return (
    <div className="client-chat-avatar">
      {src ? (
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[12px] font-semibold text-content-muted">
          {label?.[0] ?? "?"}
        </div>
      )}
    </div>
  );
}

function formatChatStatus(status) {
  return String(status || "active").replace(/_/g, " ");
}

function TypingIndicator({ teamLabel }) {
  return (
    <motion.div
      className="client-chat-row client-chat-row--team flex w-full"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="client-assistant-block">
        <Avatar src={teamAvatar} label={teamLabel} />
        <div className="client-assistant-col">
          <p className="client-chat-meta">
            <strong>{teamLabel}</strong>
          </p>
          <div className="client-typing-bubble mt-2">
            <span className="client-typing-dots inline-flex gap-1.5">
              <span />
              <span />
              <span />
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


export default function ClientCreateTicket() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const resumeId = searchParams.get("chatId");

  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streamingDraft, setStreamingDraft] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [confirmationDone, setConfirmationDone] = useState(false);
  const [pendingOptions, setPendingOptions] = useState(null);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const scrollRef = useRef(null);
  const chatRef = useRef(null);
  const wsRef = useRef(null);
  const pendingFirstMessage = useRef(null);
  const streamingContentRef = useRef("");
  const closingRef = useRef(false);

  // Keep a ref so the unmount cleanup sees the latest chat without
  // re-running the effect on every chat change.
  useEffect(() => {
    chatRef.current = chat;
  }, [chat]);

  // Resume an existing draft if one was passed via the URL; otherwise
  // start a fresh blank chat (lazily — actual creation happens on first
  // send so a user that bounces leaves no empty rows behind).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!resumeId) {
        setChat(null);
        setMessages([]);
        setStreamingDraft(null);
        return;
      }
      try {
        const [resumed, history] = await Promise.all([
          resumeChat(resumeId),
          getMessages(resumeId),
        ]);
        if (cancelled) return;
        setChat(resumed.chat);
        setMessages(history.messages || []);
        setStreamingDraft(null);
      } catch (err) {
        if (cancelled) return;
        showError(err, t("createTicket.resumeError"));
        setSearchParams({}, { replace: true });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [resumeId, setSearchParams]);

  // If the user navigates away mid-conversation, demote to draft so it
  // shows up in /client/drafts. Closed chats are skipped server-side.
  // For fresh chats, also open the WS immediately so the backend greeting
  // arrives before the user types their first message.
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      const current = chatRef.current;
      if (!current) return;
      if (current.status === "active" || current.status === "waiting_confirmation") {
        markChatAsDraft(current.id);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, streamingDraft]);

  const greetingMsg = useMemo(
    () => ({
      id: "ai-greeting",
      sender: "ai",
      content: t("createTicket.greeting"),
      aiAnswerType: "normal",
      createdAt: new Date().toISOString(),
    }),
    [t],
  );

  const suggestedPrompts = useMemo(
    () => SUGGESTED_PROMPT_KEYS.map((key) => t(`createTicket.prompts.${key}`)),
    [t],
  );

  const displayMessages = resumeId ? messages : [greetingMsg, ...messages];

  const latestSummaryId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.sender === "ai" && m.aiAnswerType === "summary") return m.id;
    }
    return null;
  }, [messages]);

  const latestAiMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === "ai") return messages[i].id;
    }
    return null;
  }, [messages]);

  const conversationTitle = useMemo(() => {
    if (!chat) return t("createTicket.newConversation");
    const summary = chat.summary?.trim();
    if (summary) {
      return summary.length > 52 ? `${summary.slice(0, 52)}…` : summary;
    }
    return t("createTicket.supportConversation");
  }, [chat, t]);

  const awaitingConfirmation = chat?.status === "waiting_confirmation";
  const awaitingOptionChoice = (pendingOptions?.options?.length ?? 0) > 0;
  const chatClosed = chat?.status === "closed";

  const ensureChat = useCallback(async () => {
    if (chat) return chat;
    const created = await createChat();
    setChat(created.chat);
    return created.chat;
  }, [chat]);

  function appendAiMessage(content, extra = {}) {
    if (!content) return;
    setMessages((prev) => [
      ...prev,
      createLocalMessage({
        sender: "ai",
        content,
        chatId: chatRef.current?.id,
        extra,
      }),
    ]);
  }

  function handleWsMessage(data) {
    if (data.type === "token") {
      const newContent = (streamingContentRef.current ?? "") + data.token;
      streamingContentRef.current = newContent;
      setStreamingDraft({ id: "streaming", content: newContent });
      return;
    }

    if (data.type === "message") {
      streamingContentRef.current = "";
      setStreamingDraft(null);
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      } else {
        appendAiMessage(data.content ?? "");
      }
      setSending(false);
      return;
    }

    if (data.type === "options") {
      const content = data.content ?? "";
      const options = Array.isArray(data.options) ? data.options : [];
      streamingContentRef.current = "";
      setStreamingDraft(null);

      if (content) {
        setMessages((prev) => {
          const lastAiIndex = prev.findLastIndex((m) => m.sender === "ai");
          const lastAi = lastAiIndex >= 0 ? prev[lastAiIndex] : null;
          const normalizedContent = normalizeMessageContent(content);
          const normalizedLastAi = normalizeMessageContent(lastAi?.content);

          if (
            lastAi &&
            (
              normalizedLastAi === normalizedContent ||
              normalizedContent.includes(normalizedLastAi) ||
              normalizedLastAi.includes(normalizedContent)
            )
          ) {
            const next = [...prev];
            next[lastAiIndex] = {
              ...lastAi,
              content:
                normalizedContent.length >= normalizedLastAi.length
                  ? content
                  : lastAi.content,
            };
            return next;
          }

          return [
            ...prev,
            createLocalMessage({
              sender: "ai",
              content,
              chatId: chatRef.current?.id,
            }),
          ];
        });
      }

      if (options.length > 0) {
        setPendingOptions({ content, options });
      } else {
        setPendingOptions(null);
      }
      setSending(false);
      return;
    }

    if (data.type === "ticket_created") {
      streamingContentRef.current = "";
      setStreamingDraft(null);
      setPendingOptions(null);
      appendAiMessage(data.content ?? t("createTicket.ticketCreatedMsg"), {
        ticketId: data.ticket_id ?? data.ticketId ?? null,
        aiAnswerType: "ticket_created",
      });
      showSuccess(t("createTicket.ticketCreated"));
      setSending(false);
      return;
    }

    if (data.type === "user_message_saved" && data.message) {
      return;
    }
  }

  function connectWS(chatId) {
    if (wsRef.current) {
      closingRef.current = true;
      wsRef.current.close();
    }
    if (pendingFirstMessage.current) setSending(true);
    const token = getToken();
    const params = new URLSearchParams();
    if (token) params.set("token", token);
    if (chatId) params.set("chat_id", chatId);
    const ws = new WebSocket(
      `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/chat?${params}`,
    );
    wsRef.current = ws;
    ws.onopen = () => {
      // Send the pending first message as soon as the connection is ready.
      // The backend waits for this before starting the workflow.
      if (pendingFirstMessage.current) {
        const msg = pendingFirstMessage.current;
        pendingFirstMessage.current = null;
        ws.send(msg);
      }
    };
    ws.onmessage = (e) => {
      try {
        handleWsMessage(JSON.parse(e.data));
      } catch (err) {
        console.error("WS parse error", err);
      }
    };
    ws.onerror = () => {
      if (!closingRef.current) {
        showError(t("createTicket.wsError"));
        setSending(false);
        setStreamingDraft(null);
      }
      closingRef.current = false;
    };
    ws.onclose = () => {
      closingRef.current = false;
      wsRef.current = null;
    };
  }

  function handleOpenFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isAllowedMime(file.type)) {
      showError(t("createTicket.attachmentTypeError"));
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      showError(`Files must be smaller than ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    setPendingFile(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = messageInput.trim();
    if ((!trimmed && !pendingFile) || sending) return;
    if (chatClosed) {
      showError(t("createTicket.closedError"));
      return;
    }
    if (awaitingConfirmation) {
      showError(t("createTicket.confirmFirst"));
      return;
    }
    if (awaitingOptionChoice) {
      showError(t("createTicket.chooseOption"));
      return;
    }

    setSending(true);
    const contentToSend = trimmed || `Attached: ${pendingFile?.name ?? "file"}`;
    const fileToSend = pendingFile;
    setMessageInput("");
    setPendingFile(null);

    let activeChat;
    try {
      activeChat = await ensureChat();
    } catch (err) {
      setSending(false);
      showError(err, t("createTicket.startError"));
      return;
    }

    let attachmentId = null;
    if (fileToSend) {
      setUploading(true);
      try {
        const att = await uploadAttachment({
          chatId: activeChat.id,
          file: fileToSend,
        });
        attachmentId = att?.id ?? null;
      } catch (err) {
        setUploading(false);
        setSending(false);
        showError(err, t("createTicket.uploadError"));
        setPendingFile(fileToSend);
        return;
      } finally {
        setUploading(false);
      }
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        chatId: activeChat.id,
        sender: "user",
        content: contentToSend,
        aiAnswerType: "normal",
        createdAt: new Date().toISOString(),
      },
    ]);
    streamingContentRef.current = "";
    setStreamingDraft({ id: "streaming", content: "" });

    const wsPayload = JSON.stringify({
      content: contentToSend,
      attachmentIds: attachmentId ? [attachmentId] : [],
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(wsPayload);
    } else {
      pendingFirstMessage.current = wsPayload;
      connectWS(activeChat.id);
    }
  }

  async function handleOptionChoice(option) {
    if (!option || sending || !pendingOptions) return;
    if (chatClosed) {
      showError(t("createTicket.closedError"));
      return;
    }

    setPendingOptions(null);
    setSending(true);

    let activeChat = chat;
    try {
      activeChat = activeChat ?? (await ensureChat());
    } catch (err) {
      setSending(false);
      showError(err, t("createTicket.startError"));
      return;
    }

    setMessages((prev) => [
      ...prev,
      createLocalMessage({
        sender: "user",
        content: option,
        chatId: activeChat.id,
      }),
    ]);
    streamingContentRef.current = "";
    setStreamingDraft({ id: "streaming", content: "" });

    const wsPayload = JSON.stringify({
      type: "option_response",
      content: option,
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(wsPayload);
    } else {
      showError(t("createTicket.connectionLost"));
      setSending(false);
      setStreamingDraft(null);
    }
  }

  async function handleConfirm(accepted) {
    if (!chat || confirming) return;
    setConfirming(true);
    try {
      const result = await confirmSummary(chat.id, accepted);
      setChat(result.chat);
      if (accepted && result.ticket) {
        showSuccess(t("createTicket.ticketCreated"));
        setMessages((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            chatId: chat.id,
            sender: "ai",
            content: t("createTicket.confirmedMsg"),
            aiAnswerType: "normal",
            createdAt: new Date().toISOString(),
          },
        ]);
      } else if (!accepted) {
        setMessages((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            chatId: chat.id,
            sender: "ai",
            content: t("createTicket.rejectedMsg"),
            aiAnswerType: "normal",
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      showError(err, t("createTicket.choiceError"));
    } finally {
      setConfirming(false);
    }
  }

  function handleNewChat() {
    pendingFirstMessage.current = null;
    streamingContentRef.current = "";
    if (chat && (chat.status === "active" || chat.status === "waiting_confirmation")) {
      markChatAsDraft(chat.id);
    }
    setChat(null);
    setMessages([]);
    setStreamingDraft(null);
    setMessageInput("");
    setAttachedFile(null);
    setPendingOptions(null);
    setIsFirstMessage(true);
    if (resumeId) setSearchParams({}, { replace: true });
    connectWS(null);
  }

  function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: conversationTitle, url }).catch(() => {});
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      showSuccess(t("createTicket.linkCopied"));
    }
  }

  function handleSuggestedPrompt(prompt) {
    if (sending || chatClosed || awaitingConfirmation || awaitingOptionChoice) {
      return;
    }
    setMessageInput(prompt);
    messageInputRef.current?.focus();
  }

  function renderMessageBody(msg, isUser) {
    const showConfirm =
      !isUser &&
      msg.aiAnswerType === "summary" &&
      msg.id === latestSummaryId &&
      awaitingConfirmation;
    const showOptionButtons =
      !isUser &&
      msg.id === latestAiMessageId &&
      awaitingOptionChoice &&
      pendingOptions?.options?.length > 0;

    if (showConfirm) {
      return (
        <>
          <p>
            Here’s how I understand your request. Please confirm before I open
            the ticket.
          </p>
          <div className="mt-3 rounded-xl border border-border-subtle bg-surface-muted p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-content-muted">
              {t("common.summary")}
            </p>
            <MarkdownMessage className="mt-1.5 leading-relaxed">
              {msg.content}
            </MarkdownMessage>
          </div>
          <p className="mt-3">{t("ticketHistory.confirmQuestion")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={`${btnNo} ${confirming ? "pointer-events-none opacity-45" : ""}`}
              onClick={() => handleConfirm(false)}
              disabled={confirming}
            >
              {t("common.no")}
            </button>
            <button
              type="button"
              className={`${btnYes} ${confirming ? "pointer-events-none opacity-45" : ""}`}
              onClick={() => handleConfirm(true)}
              disabled={confirming}
            >
              {t("common.yes")}
            </button>
          </div>
        </>
      );
    }

    if (showOptionButtons) {
      return (
        <>
          <MarkdownMessage>{msg.content}</MarkdownMessage>
          <div className="mt-3 flex flex-wrap gap-2">
            {pendingOptions.options.map((option) => (
              <button
                key={option}
                type="button"
                className={`${btnYes} ${sending ? "pointer-events-none opacity-45" : ""}`}
                onClick={() => handleOptionChoice(option)}
                disabled={sending}
              >
                {formatOptionLabel(option)}
              </button>
            ))}
          </div>
        </>
      );
    }

    return (
      <>
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <MarkdownMessage>{msg.content}</MarkdownMessage>
        )}
        {msg.ticketId ? (
          <p className="mt-2 text-[11px] font-medium text-content-muted">
            Ticket ID: {msg.ticketId}
          </p>
        ) : null}
        {msg.attachments?.length ? (
          <div className="mt-2 flex flex-col gap-1.5">
            {msg.attachments.map((att) => (
              <AttachmentChip key={att.id} attachment={att} />
            ))}
          </div>
        ) : null}
      </>
    );
  }

  function renderMessage(msg) {
    const isUser = msg.sender === "user";
    const time = formatTime(msg.createdAt);

    if (!isUser) {
      return (
        <motion.div
          key={msg.id}
          layout
          className="client-chat-row client-chat-row--team flex w-full"
          {...messageBubble}
        >
          <div className="client-assistant-block">
            <Avatar src={teamAvatar} label={t("common.ruagTeam")} />
            <div className="client-assistant-col">
              <p className="client-chat-meta">
                <strong>{t("common.ruagTeam")}</strong>
                {time ? <> · {time}</> : null}
              </p>
              <div className="client-chat-bubble-team mt-1.5 whitespace-pre-wrap">
                {renderMessageBody(msg, false)}
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={msg.id}
        layout
        className="client-chat-row client-chat-row--user flex w-full"
        {...messageBubble}
      >
        <div className="client-chat-user-col">
          <p className="client-chat-meta text-right">
            <strong>{t("common.you")}</strong>
            {time ? <> · {time}</> : null}
          </p>
          <div className="flex items-end gap-2.5">
            <div className="client-chat-bubble-user min-w-0 whitespace-pre-wrap">
              {renderMessageBody(msg, true)}
            </div>
            <Avatar src={userAvatar} label={t("common.you")} />
          </div>
        </div>
      </motion.div>
    );
  }

  function renderStreaming() {
    if (!streamingDraft) return null;
    if (!streamingDraft.content?.trim()) {
      return <TypingIndicator teamLabel={t("common.ruagTeam")} />;
    }

    const time = formatTime(new Date().toISOString());
    return (
      <motion.div
        className="client-chat-row client-chat-row--team flex w-full"
        {...messageBubble}
      >
        <div className="client-assistant-block">
          <Avatar src={teamAvatar} label="Ruag Team" />
          <div className="client-assistant-col">
            <p className="client-chat-meta">
              <strong>Ruag Team</strong>
              {time ? <> · {time}</> : null}
            </p>
            <div className="client-chat-bubble-team mt-1.5 whitespace-pre-wrap">
              {streamingDraft.content}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  const placeholderText = chat
    ? chatClosed
      ? t("createTicket.placeholderClosed")
      : awaitingConfirmation
        ? t("createTicket.placeholderConfirm")
        : awaitingOptionChoice
          ? t("createTicket.placeholderOption")
          : t("createTicket.placeholderWrite")
    : t("createTicket.placeholderStart");

  const inputDisabled =
    sending || chatClosed || awaitingConfirmation || awaitingOptionChoice;

  return (
    <PortalLayout mode="client">
      <motion.section className="client-chat-shell" {...scaleIn}>
        <header className="client-chat-header flex shrink-0 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <h1 className="client-chat-header-title truncate">
              {conversationTitle}
            </h1>
            <span className="client-chat-status-badge shrink-0">
              {formatChatStatus(chat?.status ?? "active")}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigate("/client/drafts")}
              className="client-chat-header-btn hidden sm:inline-flex"
            >
              {t("createTicket.drafts")}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="client-chat-header-btn"
              aria-label={t("createTicket.shareAria")}
            >
              <FaRegShareFromSquare className="text-[13px]" aria-hidden />
              <span className="hidden sm:inline">{t("createTicket.share")}</span>
            </button>
            <button
              type="button"
              onClick={handleNewChat}
              className="client-chat-header-btn client-chat-header-btn--primary"
            >
              {t("createTicket.newChat")}
            </button>
          </div>
        </header>

        <div ref={scrollRef} className={`client-chat-messages ${scrollPretty}`}>
          <div className="client-chat-thread">
            {displayMessages.map(renderMessage)}
            {messages.length === 0 && !streamingDraft ? (
              <motion.div
                className="mt-1 grid gap-2 sm:grid-cols-2"
                {...fadeInUp}
              >
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="client-chat-prompt-btn"
                    onClick={() => handleSuggestedPrompt(prompt)}
                    disabled={inputDisabled}
                  >
                    {prompt}
                  </button>
                ))}
              </motion.div>
            ) : null}
            {renderStreaming()}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="client-chat-footer">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept="image/*,application/pdf,text/*"
            className="hidden"
          />
          {pendingFile ? (
            <div className="mx-auto mb-2 flex w-full max-w-[1000px] items-center justify-end">
              <span className="inline-flex max-w-full items-center gap-2 truncate rounded-full bg-[var(--client-chat-user-bg)] px-3 py-1 text-[12px] font-medium text-[var(--client-chat-user-fg)] ring-1 ring-[var(--client-chat-user-ring)]">
                <FiPaperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{pendingFile.name}</span>
                <span className="shrink-0 text-content-muted">
                  {formatBytes(pendingFile.size)}
                </span>
                <button
                  type="button"
                  onClick={() => setPendingFile(null)}
                  className="text-content-muted hover:text-content"
                  aria-label={t("createTicket.removeAttachment")}
                >
                  <FiX className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          ) : null}
          <div className="client-chat-composer">
            <button
              type="button"
              onClick={handleOpenFilePicker}
              disabled={inputDisabled}
              className="client-chat-composer-icon"
              aria-label={t("createTicket.addAttachment")}
              title={t("createTicket.attachTitle")}
            >
              <FiPlus className="h-5 w-5" strokeWidth={2} />
            </button>
            <label className="sr-only" htmlFor="create-ticket-message">
              {t("createTicket.writeMessage")}
            </label>
            <input
              ref={messageInputRef}
              id="create-ticket-message"
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={
                uploading ? t("createTicket.uploading") : placeholderText
              }
              disabled={inputDisabled}
              className="min-h-[46px] min-w-0 flex-1 border-0 bg-transparent px-1 text-[15px] text-content placeholder:text-content-muted focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
            />
            <div className="client-chat-composer-tools">
              <button
                type="button"
                className="client-chat-composer-icon"
                aria-label={t("createTicket.emoji")}
                disabled
              >
                <FiSmile className="text-[17px]" />
              </button>
              <button
                type="button"
                onClick={handleOpenFilePicker}
                disabled={inputDisabled}
                className="client-chat-composer-icon"
                aria-label={t("createTicket.attachFile")}
              >
                <FiPaperclip className="text-[17px]" />
              </button>
              <button
                type="submit"
                disabled={
                  inputDisabled || (!messageInput.trim() && !pendingFile)
                }
                className="client-chat-send-btn"
                aria-label={t("createTicket.sendMessage")}
              >
                <FiSend className="text-[17px]" />
              </button>
            </div>
          </div>
        </form>
      </motion.section>
    </PortalLayout>
  );
}
