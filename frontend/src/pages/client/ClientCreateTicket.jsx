import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FaRegShareFromSquare } from "react-icons/fa6";
import { FiCheck, FiPaperclip, FiPlus, FiSend, FiSmile, FiX } from "react-icons/fi";
import PortalLayout from "../../layouts/PortalLayout.jsx";
import MarkdownMessage from "../../components/MarkdownMessage.jsx";

import {
  attachmentDownloadUrl,
  createChat,
  getMessages,
  markChatAsDraft,
  resumeChat,
  uploadAttachment,
} from "../../lib/chatApi.js";
import { getToken } from "../../lib/session.js";
import { showError, showSuccess } from "../../lib/toast.js";
import { fadeInUp } from "../../lib/motion.js";

const MAX_WS_RECONNECT_ATTEMPTS = 12;

const MAX_UPLOAD_MB = 10;
const ALLOWED_PREFIXES = ["image/", "application/pdf", "text/"];

/*
TODO: Not all the changes coudlnt be integrated
- Chat selection buttons
- Updated UI
Here is the file commit with the expected new chat features:
https://github.com/tamannaKumavat/smart-feedback-management-system/blob/5053a038a7a1eb8bf6c4586e100f985dd2ea7300/frontend/src/pages/client/ClientCreateTicket.jsx

*/


const SUGGESTED_PROMPTS = [
  "I can't log in to my account",
  "I need help drafting a support ticket",
  "Something is broken in production",
  "Can you summarize my issue for me?",
];

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
const btnOptionBase =
  "inline-flex items-center justify-center rounded-full px-4 py-2 text-[12px] font-semibold transition hover:brightness-[0.97] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
const btnYes = `${btnOptionBase} bg-teal-600 text-white hover:bg-teal-700`;
const btnNo = `${btnOptionBase} bg-slate-200 text-slate-700 hover:bg-slate-300`;
const btnOptionRedo = `${btnOptionBase} bg-slate-200 text-slate-600 hover:bg-slate-300`;
const btnOptionAdditional = `${btnOptionBase} bg-[#020d3d] text-white hover:bg-[#0a1a5c]`;
const btnOptionNeutral = `${btnOptionBase} bg-slate-400 text-white hover:bg-slate-500`;
const btnOptionViolet = `${btnOptionBase} bg-violet-500 text-white hover:bg-violet-600`;

const OPTION_FALLBACK_STYLES = [
  btnOptionNeutral,
  btnOptionAdditional,
  btnOptionViolet,
  btnOptionRedo,
];

const bubbleUser = "rounded-[18px] bg-[#E7F3FF] px-4 py-2.5 text-[13px] leading-relaxed text-[#1e293b] shadow-sm ring-1 ring-sky-200/40";
const bubbleTeam = "rounded-[18px] bg-white px-4 py-2.5 text-[13px] leading-relaxed text-[#1e293b] shadow-sm ring-1 ring-slate-200/90";
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
  return option.charAt(0).toUpperCase() + option.slice(1);
}

function getOptionVariant(option) {
  const low = option.toLowerCase();
  if (["no", "cancel", "decline", "reject"].includes(low)) return "muted";
  if (["yes", "confirm", "ok", "accept", "approve"].includes(low)) return "primary";
  if (["redo", "retry", "again"].includes(low)) return "redo";
  if (["additional", "more", "other", "details"].includes(low)) return "additional";
  return null;
}

function optionButtonClass(option, index = 0) {
  const variant = getOptionVariant(option);
  if (variant === "primary") return btnYes;
  if (variant === "muted") return btnNo;
  if (variant === "redo") return btnOptionRedo;
  if (variant === "additional") return btnOptionAdditional;
  return OPTION_FALLBACK_STYLES[index % OPTION_FALLBACK_STYLES.length];
}

function isTicketCreatedMessage(content) {
  return /successfully created/i.test(String(content ?? ""));
}

function sortOptionsForDisplay(options) {
  const order = (option) => {
    const low = option.toLowerCase();
    if (["no", "cancel", "decline", "reject"].includes(low)) return 0;
    if (["redo", "retry", "again"].includes(low)) return 1;
    if (["additional", "more", "other", "details"].includes(low)) return 2;
    if (["yes", "confirm", "ok", "accept", "approve"].includes(low)) return 4;
    return 3;
  };
  return [...options].sort((a, b) => order(a) - order(b));
}

function buildChatWsUrl({ token, chatId }) {
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (chatId) params.set("chat_id", chatId);
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/chat?${params}`;
}

function isSupportTicketContent(content) {
  if (!content?.trim()) return false;
  return (
    /support ticket/i.test(content)
    || /\*\*Title\*\*/i.test(content)
    || /^\d+\.\s+\*\*Title\*\*/im.test(content)
  );
}

function normalizeTicketMarkdown(content) {
  return String(content ?? "")
    .replace(/(\d+\.\s+\*\*[^\n]+)\n+\n+(\d+\.\s+\*\*)/g, "$1\n$2")
    .trim();
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
        className="block max-w-[260px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
      >
        <img
          src={href}
          alt={attachment.filename}
          className="block max-h-48 w-full object-cover"
          loading="lazy"
        />
        <div className="flex items-center justify-between gap-2 px-2 py-1 text-[11px] text-slate-500">
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
      className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-100"
    >
      <FiPaperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate font-medium">{attachment.filename}</span>
      <span className="shrink-0 text-slate-400">
        {formatBytes(attachment.sizeBytes)}
      </span>
    </a>
  );
}

function Avatar({ src, label }) {
  return (
    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[#d8dce4] bg-white">
      {src ? (
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-[#6b7280]">
          {label?.[0] ?? "?"}
        </div>
      )}
    </div>
  );
}

function AnswerFoundModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="answer-found-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close answer found dialog"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.28)]"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-teal-50/90 to-transparent" />
            <div className="relative px-6 pb-6 pt-8">
              <motion.div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-teal-600 ring-8 ring-teal-50"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.08 }}
              >
                <FiSmile className="text-[26px]" aria-hidden />
              </motion.div>
              <motion.h2
                id="answer-found-title"
                className="mt-5 text-center text-[20px] font-semibold tracking-tight text-[#0f172a]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.28 }}
              >
                Glad we could help
              </motion.h2>
              <motion.p
                className="mt-2 text-center text-[14px] leading-relaxed text-slate-600"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.28 }}
              >
                We&apos;re glad you found an answer. No ticket was needed — start a new chat anytime if you need more help.
              </motion.p>
              <motion.div
                className="mt-7"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.26, duration: 0.28 }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex w-full items-center justify-center rounded-full bg-[#020c3d] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#0a1a5c] active:scale-[0.98]"
                >
                  New Chat
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function TicketSuccessModal({ open, onClose, onGoDashboard }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ticket-success-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close success dialog"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_60px_-12px_rgba(15,23,42,0.28)]"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-50/90 to-transparent" />
            <div className="relative px-6 pb-6 pt-8">
              <motion.div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.08 }}
              >
                <FiCheck className="text-[26px]" aria-hidden />
              </motion.div>
              <motion.h2
                id="ticket-success-title"
                className="mt-5 text-center text-[20px] font-semibold tracking-tight text-[#0f172a]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.28 }}
              >
                Ticket submitted
              </motion.h2>
              <motion.p
                className="mt-2 text-center text-[14px] leading-relaxed text-slate-600"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.28 }}
              >
                Your ticket is in progress. You can follow its status on the dashboard.
              </motion.p>
              <motion.div
                className="mt-7 flex flex-col gap-2.5 sm:flex-row"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.26, duration: 0.28 }}
              >
                <button
                  type="button"
                  onClick={onGoDashboard}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-[#020c3d] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#0a1a5c] active:scale-[0.98]"
                >
                  Go to Dashboard
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-slate-200 px-4 py-2.5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-300 active:scale-[0.98]"
                >
                  New Chat
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function TypingIndicator() {
  return (
    <motion.article
      className="w-full max-w-[min(100%,560px)]"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      aria-live="polite"
      aria-label="Ruag Team is typing"
    >
      <p className="mb-2 pl-12 text-[14px] font-semibold leading-none text-[#101827]">
        Ruag Team
      </p>
      <div className="flex items-end gap-2 justify-start">
        <Avatar src={teamAvatar} label="Ruag Team" />
        <div className={`max-w-[560px] ${bubbleTeam} px-4 py-3`}>
          <span className="client-typing-dots inline-flex gap-1.5">
            <span />
            <span />
            <span />
          </span>
        </div>
      </div>
    </motion.article>
  );
}


export default function ClientCreateTicket() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const chatId = searchParams.get("chatId");
  const token = getToken();

  // State
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsReconnectAttempt, setWsReconnectAttempt] = useState(0);
  const [aiWaitingForInput, setAiWaitingForInput] = useState(true);
  const [pendingOptions, setPendingOptions] = useState(null);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [ticketCompleted, setTicketCompleted] = useState(false);
  const [ticketSuccessOpen, setTicketSuccessOpen] = useState(false);
  const [answerFoundOpen, setAnswerFoundOpen] = useState(false);
  // Refs
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const wsRef = useRef(null);
  const chatRef = useRef(null);
  const wsReconnectAttemptRef = useRef(0);
  const wsReconnectTimerRef = useRef(null);
  const wsLeavingRef = useRef(false);
  const ticketCompletedRef = useRef(false);

  const markTicketSubmitted = useCallback(() => {
    ticketCompletedRef.current = true;
    setTicketCompleted(true);
    setWaitingForResponse(false);
    setTicketSuccessOpen(true);
    setAnswerFoundOpen(false);
    setAiWaitingForInput(false);
    setPendingOptions(null);
  }, []);

  const markAnswerFound = useCallback(() => {
    ticketCompletedRef.current = true;
    setTicketCompleted(true);
    setWaitingForResponse(false);
    setAnswerFoundOpen(true);
    setTicketSuccessOpen(false);
    setAiWaitingForInput(false);
    setPendingOptions(null);
  }, []);

  const closeWebSocketConnection = useCallback((
    reason = "connection closed",
    { updateState = true, preventReconnect = true } = {},
  ) => {
    if (wsReconnectTimerRef.current) {
      window.clearTimeout(wsReconnectTimerRef.current);
      wsReconnectTimerRef.current = null;
    }

    if (preventReconnect) {
      wsReconnectAttemptRef.current = MAX_WS_RECONNECT_ATTEMPTS;
    }

    const active = wsRef.current;
    if (active) {
      active.onopen = null;
      active.onmessage = null;
      active.onerror = null;
      active.onclose = null;
      if (
        active.readyState === WebSocket.OPEN
        || active.readyState === WebSocket.CONNECTING
      ) {
        active.close(1000, reason);
      }
      wsRef.current = null;
    }

    if (updateState) {
      setWsConnected(false);
      setAiWaitingForInput(false);
    }
  }, []);

  // Close WebSocket when the user leaves the chat screen (SPA navigation or tab close).
  useEffect(() => {
    wsLeavingRef.current = false;

    const handleLeaveChat = () => {
      wsLeavingRef.current = true;
      closeWebSocketConnection("left chat screen", { updateState: false });
    };

    window.addEventListener("pagehide", handleLeaveChat);
    return () => {
      window.removeEventListener("pagehide", handleLeaveChat);
      handleLeaveChat();
    };
  }, [closeWebSocketConnection]);




  useEffect(() => {
    let cancelled = false;

    async function initializeChat() {
      try {
        if (chatId) {
          // Resume existing chat from URL parameter
          const [resumed, history] = await Promise.all([
            resumeChat(chatId),
            getMessages(chatId),
          ]);

          if (cancelled) return;
          setChat(resumed.chat);
          setMessages(history.messages || []);
        } else {
          // Create brand new chat
          const created = await createChat();
          if (cancelled) return;
          setChat(created.chat);
          setMessages([]);
        }
      } catch (err) {
        if (cancelled) return;
        showError(err, "Could not initialize chat");
      }
    }

    initializeChat();

    return () => {
      cancelled = true;
    };
  }, [chatId]); // Only depends on chatId from URL

  // Step 2: Keep chatRef in sync with chat state
  useEffect(() => {
    chatRef.current = chat;
  }, [chat]);

  // Mark as draft when navigating away or closing the tab mid-flow.
  // mark_as_draft on the backend is a no-op for already-closed issues.
  useEffect(() => {
    if (!chat) return;
    const markDraft = () => {
      if (chatRef.current?.id) markChatAsDraft(chatRef.current.id);
    };
    window.addEventListener("beforeunload", markDraft);
    return () => {
      window.removeEventListener("beforeunload", markDraft);
      markDraft(); // also fires on React unmount (SPA navigation)
    };
  }, [chat?.id]);

  // Step 3: Connect WebSocket ONLY after chat is initialized
  useEffect(() => {
    if (!chat || wsLeavingRef.current) return;

    let cancelled = false;

    const scheduleReconnect = () => {
      if (cancelled || wsLeavingRef.current) return;
      if (wsReconnectAttemptRef.current >= MAX_WS_RECONNECT_ATTEMPTS) {
        return;
      }

      wsReconnectAttemptRef.current += 1;
      setWsReconnectAttempt(wsReconnectAttemptRef.current);
      const delayMs = Math.min(1500 * wsReconnectAttemptRef.current, 10000);
      wsReconnectTimerRef.current = window.setTimeout(() => {
        wsReconnectTimerRef.current = null;
        connectWebSocket();
      }, delayMs);
    };

    const connectWebSocket = () => {
      if (cancelled || wsLeavingRef.current) return;

      closeWebSocketConnection("starting new connection", {
        updateState: false,
        preventReconnect: false,
      });
      if (wsLeavingRef.current) return;

      const wsUrl = buildChatWsUrl({ token, chatId: chat.id });
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled || wsLeavingRef.current) {
          closeWebSocketConnection("connection aborted", {
            updateState: false,
            preventReconnect: wsLeavingRef.current,
          });
          return;
        }
        wsReconnectAttemptRef.current = 0;
        setWsReconnectAttempt(0);
        setWsConnected(true);
        setAiWaitingForInput(true);
        setPendingOptions(null);
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);

          if (data.type === "options") {
            const messageId = `ai-${Date.now()}`;
            const options = Array.isArray(data.options) ? data.options : [];
            setWaitingForResponse(false);
            setAiWaitingForInput(true);
            setPendingOptions({ messageId, options });
            setMessages((prev) => [...prev, {
              id: messageId,
              sender: "ai",
              content: data.content ?? "",
              options,
              aiAnswerType: "normal",
              createdAt: new Date().toISOString(),
            }]);
          } else if (data.type === "message") {
            setPendingOptions(null);
            setMessages((prev) => [...prev, {
              id: `ai-${Date.now()}`,
              sender: "ai",
              content: data.content,
              aiAnswerType: "normal",
              createdAt: new Date().toISOString(),
            }]);
            if (isTicketCreatedMessage(data.content)) {
              markTicketSubmitted();
            } else if (isSupportTicketContent(data.content)) {
              // Ticket preview often arrives before a follow-up options message.
              setWaitingForResponse(true);
              setAiWaitingForInput(false);
            } else {
              setWaitingForResponse(false);
              setAiWaitingForInput(true);
            }
          } else if (data.type === "chat_closed") {
            setWaitingForResponse(false);
            setAiWaitingForInput(false);
            setPendingOptions(null);
            if (!ticketCompletedRef.current) {
              markAnswerFound();
            } else {
              setTicketCompleted(true);
            }
          }
        } catch {
          setWaitingForResponse(false);
          setAiWaitingForInput(true);
          setMessages((prev) => [...prev, {
            id: `ai-${Date.now()}`,
            sender: "ai",
            content: e.data,
            aiAnswerType: "normal",
            createdAt: new Date().toISOString(),
          }]);
        }
      };

      ws.onerror = () => {
        setWsConnected(false);
      };

      ws.onclose = (event) => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        setWsConnected(false);
        setAiWaitingForInput(false);

        if (!cancelled && !wsLeavingRef.current && !ticketCompletedRef.current && event.code !== 1000) {
          scheduleReconnect();
        }
      };
    };

    connectWebSocket();

    return () => {
      cancelled = true;
      closeWebSocketConnection("chat session ended", {
        preventReconnect: wsLeavingRef.current,
      });
    };
  }, [chat, token, closeWebSocketConnection, markTicketSubmitted, markAnswerFound]);

  async function handleOptionChoice(option, messageId) {
    if (!option || sending || !pendingOptions) return;
    if (messageId && pendingOptions.messageId !== messageId) return;
    setPendingOptions(null);
    setSending(true);
    setWaitingForResponse(true);

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: "user",
        content: option,
        aiAnswerType: "normal",
        createdAt: new Date().toISOString(),
      },
    ]);

    const wsPayload = JSON.stringify({
      type: "option_response",
      content: option,
    });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(wsPayload);
      setSending(false); // <-- Critical: Re-enable input after sending
    } else {
      showError("Connection lost. Please try again.");
      setSending(false);
      setWaitingForResponse(false);
    }
  }
  // Auto-scroll when messages update or while waiting for Ruag's reply
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, waitingForResponse]);
  const displayMessages = chatId ? messages : [...messages];
  // Handle file selection
  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isAllowedMime(file.type)) {
      showError("Only images, PDFs, and text files are supported as attachments.");
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      showError(`Files must be smaller than ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    setPendingFile(file);
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = messageInput.trim();
    if ((!trimmed && !pendingFile) || sending || !aiWaitingForInput) return;

    setSending(true);
    setWaitingForResponse(true);
    setAiWaitingForInput(false);
    const contentToSend = trimmed || `Attached: ${pendingFile?.name ?? "file"}`;
    setMessageInput("");
    setPendingFile(null);

    // Add user message to UI immediately
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: "user",
        content: contentToSend,
        aiAnswerType: "normal",
        createdAt: new Date().toISOString(),
        attachments: pendingFile ? [{ id: "temp", filename: pendingFile.name }] : [],
      },
    ]);

    // Upload file if attached (but don't send attachment ID in the message)
    if (pendingFile) {
      setUploading(true);
      try {
        await uploadAttachment({
          chatId: chat?.id ?? "temp",
          file: pendingFile,
        });
      } catch (err) {
        showError(err, "Upload failed");
      } finally {
        setUploading(false);
      }
    }

    // Send raw text via WebSocket (like the simple script)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(contentToSend);
    } else {
      showError("WebSocket not connected");
      setWaitingForResponse(false);
      setAiWaitingForInput(true);
    }
    setSending(false);
  };

  const handleSuggestedPrompt = (prompt) => {
    setMessageInput(prompt);
  };


  const handleNewChat = async () => {
    closeWebSocketConnection("new chat", { preventReconnect: false });
    wsReconnectAttemptRef.current = 0;
    ticketCompletedRef.current = false;
    setTicketCompleted(false);
    setTicketSuccessOpen(false);
    setAnswerFoundOpen(false);
    setWaitingForResponse(false);
    setMessages([]);
    setMessageInput("");
    setPendingFile(null);
    setAiWaitingForInput(true);
    setPendingOptions(null);
    setSearchParams({});

    try {
      const created = await createChat();
      setChat(created.chat);
    } catch (err) {
      showError(err, "Could not start new chat");
    }
  };

  const handleShare = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: "Chat", url }).catch(() => { });
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      showSuccess("Link copied");
    }
  };

  // Render a single message
  const renderMessage = (msg) => {
    const isUser = msg.sender === "user";
    const time = formatTime(msg.createdAt);
    const isTicket = !isUser && isSupportTicketContent(msg.content);
    const showOptions =
      !isUser
      && msg.options?.length > 0
      && pendingOptions?.messageId === msg.id;


    return (
      <article
        key={msg.id}
        className={isUser ? "ml-auto w-full max-w-[min(100%,560px)]" : "w-full max-w-[min(100%,560px)]"}
      >
        <p className={`mb-2 text-[14px] font-semibold leading-none text-[#101827] ${isUser ? "text-right pr-11" : "pl-12"}`}>
          {isUser ? "You" : "Ruag Team"}
          {time ? `, ${time}` : ""}
        </p>
        <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
          {!isUser ? <Avatar src={teamAvatar} label="Ruag Team" /> : null}
          <div className={`max-w-[560px] ${isUser ? bubbleUser : bubbleTeam} ${isTicket ? "" : "whitespace-pre-wrap"}`}>
            {msg.content ? (
              isTicket ? (
                <MarkdownMessage>{normalizeTicketMarkdown(msg.content)}</MarkdownMessage>
              ) : (
                <p>{msg.content}</p>
              )
            ) : null}
            {showOptions ? (
              <div
                className={`${
                  msg.options.length >= 3 ? "grid grid-cols-1 gap-2 sm:grid-cols-2" : "flex flex-wrap gap-2"
                } ${msg.content ? "mt-3" : ""}`}
              >
                {sortOptionsForDisplay(msg.options).map((option, index) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleOptionChoice(option, msg.id)}
                    disabled={sending}
                    className={optionButtonClass(option, index)}
                  >
                    {formatOptionLabel(option)}
                  </button>
                ))}
              </div>
            ) : null}
            {msg.attachments?.length ? (
              <div className="mt-2 flex flex-col gap-1.5">
                {msg.attachments.map((att) => (
                  <AttachmentChip key={att.id} attachment={att} />
                ))}
              </div>
            ) : null}
          </div>
          {isUser ? <Avatar src={userAvatar} label="You" /> : null}
        </div>
      </article>
    );
  };

  const inputDisabled =
    ticketCompleted
    || !wsConnected
    || !aiWaitingForInput
    || sending
    || (pendingOptions?.options?.length > 0);

  const showTypingIndicator =
    !ticketCompleted
    && wsConnected
    && waitingForResponse
    && !pendingOptions?.options?.length;

  return (
    <PortalLayout mode="client">
      <section className="mx-auto flex h-full min-h-0 w-full max-w-[920px] flex-col overflow-hidden rounded-none border-0 bg-white shadow-none md:rounded-xl md:border md:border-slate-200/80 md:shadow-sm">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200/90 bg-white px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <h1 className="text-[17px] font-semibold leading-tight text-[#0f172a] sm:text-[20px]">
              Chat
            </h1>
          </div>
          <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-3 py-2 text-[12px] font-medium text-[#111827] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:bg-slate-50 sm:h-auto sm:flex-none sm:px-4 sm:text-[13px]"
            >
              <FaRegShareFromSquare className="text-[14px]" aria-hidden />
              <span className="hidden xs:inline">Share</span>
            </button>
            <button
              type="button"
              onClick={handleNewChat}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-full bg-[#020c3d] px-3 py-2 text-[12px] font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.18)] transition hover:bg-[#0a1a5c] sm:h-auto sm:flex-none sm:px-4 sm:text-[13px]"
            >
              New Chat
            </button>
          </div>
        </header>
        <div ref={scrollRef} className={`client-chat-messages ${scrollPretty} flex-1 min-h-0`}>
          <div className="client-chat-thread">
            {displayMessages.map(renderMessage)}

            {/* Ruag typing indicator while the next WS message is expected */}
            {showTypingIndicator && <TypingIndicator />}

            {/* Suggested prompts - shows only after the greeting message was sent.*/}
            {messages.length === 1 && (
              <motion.div className="mt-1 grid gap-2 sm:grid-cols-2" {...fadeInUp}>
                {SUGGESTED_PROMPTS.map((prompt) => (
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
            )}

          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="client-chat-footer"
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept="image/*,application/pdf,text/*"
            className="hidden"
          />
          {pendingFile ? (
            <div className="mx-auto mb-2 flex max-w-[720px] items-center justify-end">
              <span className="inline-flex max-w-full items-center gap-2 truncate rounded-full bg-[#E7F3FF] px-3 py-1 text-[12px] font-medium text-[#1e293b] ring-1 ring-sky-200/40">
                <FiPaperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{pendingFile.name}</span>
                <span className="shrink-0 text-slate-500">
                  {formatBytes(pendingFile.size)}
                </span>
                <button
                  type="button"
                  onClick={() => setPendingFile(null)}
                  className="text-slate-500 hover:text-slate-800"
                  aria-label="Remove attachment"
                >
                  <FiX className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          ) : null}
          <div className="mx-auto flex max-w-[720px] items-center gap-0.5 rounded-2xl border border-[#e7e9ef] bg-white px-2 py-1.5 shadow-[0_1px_1px_rgba(16,24,40,0.04)] sm:gap-1 sm:px-3 sm:py-2">
            <button
              type="button"
              onClick={handleOpenFilePicker}
              disabled={inputDisabled}
              className="inline-flex h-9 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-9"
              aria-label="Add attachment"
              title="Attach an image, PDF or text file"
            >
              <FiPlus className="h-5 w-5" strokeWidth={2} />
            </button>
            <label className="sr-only" htmlFor="create-ticket-message">
              Write your message
            </label>
            <input
              id="create-ticket-message"
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={uploading ? "Uploading attachment..." : "Write your message..."}
              disabled={inputDisabled}
              className="min-h-[44px] min-w-0 flex-1 border-0 bg-transparent text-[14px] text-[#1e293b] placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed sm:text-[15px]"
            />
            <button
              type="button"
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#c2c8d3] transition hover:text-slate-600 xs:inline-flex"
              aria-label="Emoji"
              disabled
            >
              <FiSmile className="text-[17px]" />
            </button>
            <button
              type="button"
              onClick={handleOpenFilePicker}
              disabled={inputDisabled}
              className="inline-flex h-9 w-8 shrink-0 items-center justify-center rounded-full text-[#c2c8d3] transition hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-9"
              aria-label="Attach file"
            >
              <FiPaperclip className="text-[17px]" />
            </button>
            <button
              type="submit"
              disabled={inputDisabled || (!messageInput.trim() && !pendingFile)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#020c3d] text-white shadow-sm transition hover:bg-[#0a1a5c] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
            >
              <FiSend className="text-[18px]" />
            </button>
          </div>
          {!wsConnected && !ticketCompleted && (
            <div className="mt-2 text-center text-sm text-red-500">
              Disconnected from server.
              {wsReconnectAttempt > 0
                ? ` Reconnect attempt ${wsReconnectAttempt}/${MAX_WS_RECONNECT_ATTEMPTS}…`
                : " Reconnecting…"}
            </div>
          )}
        </form>
      </section>

      <AnswerFoundModal
        open={answerFoundOpen}
        onClose={handleNewChat}
      />
      <TicketSuccessModal
        open={ticketSuccessOpen}
        onClose={handleNewChat}
        onGoDashboard={() => {
          setTicketSuccessOpen(false);
          navigate("/client/dashboard");
        }}
      />
    </PortalLayout>
  );
}