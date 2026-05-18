import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FaRegShareFromSquare } from "react-icons/fa6";
import { FiPaperclip, FiPlus, FiSend, FiSmile, FiX } from "react-icons/fi";
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
import { showError, showSuccess } from "../../lib/toast.js";
import { fadeInUp } from "../../lib/motion.js";

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
const btnYes = "client-btn-option";
const btnNo = "client-btn-option-muted";

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

function TypingIndicator() {
  return (
    <motion.div
      className="client-chat-row client-chat-row--team flex w-full"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="client-assistant-block">
        <Avatar src={teamAvatar} label="Ruag Team" />
        <div className="client-assistant-col">
          <p className="client-chat-meta">
            <strong>Ruag Team</strong>
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
  const [aiWaitingForInput, setAiWaitingForInput] = useState(true);
  
  // Refs
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const wsRef = useRef(null);
  const chatRef = useRef(null);


 async function handleOptionChoice(option) {
    if (!option || sending || !pendingOptions) return;
    if (chatClosed) {
      showError("This chat is closed. Start a new one.");
      return;
    }

    setPendingOptions(null);
    setSending(true);

    let activeChat = chat;
    try {
      activeChat = activeChat ?? (await ensureChat());
    } catch (err) {
      setSending(false);
      showError(err, "Could not start chat");
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
      showError("Connection lost. Please try again.");
      setSending(false);
      setStreamingDraft(null);
    }
  }

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
  if (!chat) return; // Wait for chat to be created/loaded

    const wsParams = new URLSearchParams();
    if (token) wsParams.set("token", token);
    wsParams.set("chat_id", chat.id); // Always use chat.id, never URL param
    const wsUrl = `ws://${window.location.hostname}:8000/ws/chat?${wsParams}`;
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      return;
    }
    
    const setupWebSocket = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS] Connected");
        setWsConnected(true);
        setAiWaitingForInput(false);
        showSuccess("Connected to server");
        
      }; 

      ws.onmessage = (e) => {
        console.log("[WS] Message received:", e.data);
        try {
          const data = JSON.parse(e.data);
          console.log(chatRef.current)
          if (data.type === "options") {
            setAiWaitingForInput(true);
            if (data.content) {
              const optionsHint = data.options && data.options.length > 0
                ? ` (${data.options.join(" / ")})`
                : "";
              setMessages((prev) => [...prev, {
                id: `ai-${Date.now()}`,
                sender: "ai",
                content: `${data.content}${optionsHint}`,
                aiAnswerType: "normal",
                createdAt: new Date().toISOString(),
              }]);
            }
          }
          else if (data.type === "message" && data.content) {
            setAiWaitingForInput(false);
            setMessages((prev) => [...prev, {
              id: `ai-${Date.now()}`,
              sender: "ai",
              content: data.content,
              aiAnswerType: "normal",
              createdAt: new Date().toISOString(),
            }]);
          }
          // ignore unknown/internal workflow messages
        } catch (err) {
          setMessages((prev) => [...prev, {
            id: `ai-${Date.now()}`,
            sender: "ai",
            content: e.data,
            aiAnswerType: "normal",
            createdAt: new Date().toISOString(),
          }]);
        }
      }; 

      ws.onerror = (error) => {
        console.error("[WS] Error:", error);
        showError(`WebSocket error`);
        setWsConnected(false);
      };

      ws.onclose = () => {
        console.log("[WS] Disconnected");
        setWsConnected(false);
        setAiWaitingForInput(false);
      };
    };

    setupWebSocket();

    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [chat]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);
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
        chatId: "temp", // Replace with actual chat ID if needed
        file: pendingFile,
      });
      // Optionally update the message with the attachment ID later
    } catch (err) {
      showError(err, "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // Send raw text via WebSocket (like the simple script)
  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
    wsRef.current.send(contentToSend); // Send raw text, not JSON
  } else {
    showError("WebSocket not connected");
  }
  setSending(false);
};

  // Start a new chat
  const handleNewChat = async () => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setMessages([]);
    setMessageInput("");
    setPendingFile(null);
    setWsConnected(false);
    setAiWaitingForInput(false);
    setSearchParams({});

    try {
      const created = await createChat();
      setChat(created.chat); // triggers WS effect with correct chat.id
    } catch (err) {
      showError(err, "Could not start new chat");
    }
  };

  // Share chat link
  const handleShare = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: "Chat", url }).catch(() => {});
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      showSuccess("Link copied");
    }
  };

  // Render a single message
  const renderMessage = (msg) => {
    const isUser = msg.sender === "user";
    const time = formatTime(msg.createdAt);


    return (
      <article
        key={msg.id}
        className={isUser ? "ml-auto w-full max-w-[min(100%,560px)]" : "w-full max-w-[min(100%,560px)]"}
      >
        <p className={`mb-2 text-[14px] font-semibold leading-none text-[#101827] ${isUser ? "text-right pr-11" : "pl-12"}`}>
          {isUser ? "You" : "Team"}
          {time ? `, ${time}` : ""}
        </p>
        <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
          {!isUser ? <Avatar src={teamAvatar} label="Team" /> : null}
          <div className={`max-w-[560px] ${isUser ? bubbleUser : bubbleTeam}`}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{msg.content}</p>
            ) : (
              <MarkdownMessage>{msg.content}</MarkdownMessage>
            )}
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


  const inputDisabled = !wsConnected || !aiWaitingForInput || sending;

  return (
    <PortalLayout mode="client">
      <section className="mx-auto flex h-[calc(100dvh-6rem)] max-h-[calc(100dvh-6rem)] min-h-0 w-full max-w-[920px] flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/90 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <h1 className="text-[18px] font-semibold leading-tight text-[#0f172a] sm:text-[20px]">
              Chat
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-[13px] font-medium text-[#111827] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:bg-slate-50"
            >
              <FaRegShareFromSquare className="text-[14px]" aria-hidden />
              Share
            </button>
            <button
              type="button"
              onClick={handleNewChat}
              className="rounded-full bg-[#020c3d] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.18)] transition hover:bg-[#0a1a5c]"
            >
              New Chat
            </button>
          </div>
        </header>

        <div ref={scrollRef} className={`client-chat-messages ${scrollPretty}`}>
          <div className="client-chat-thread">
            {displayMessages.map(renderMessage)}
            {messages.length === 0 ? (
              <motion.div
                className="mt-1 grid gap-2 sm:grid-cols-2"
                {...fadeInUp}
              >
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
            ) : null}
            {/**/} 
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="shrink-0 border-t border-slate-200/90 bg-white px-4 pb-4 pt-3 sm:px-6"
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
          <div className="mx-auto flex max-w-[720px] items-center gap-1 rounded-2xl border border-[#e7e9ef] bg-white px-3 py-2 shadow-[0_1px_1px_rgba(16,24,40,0.04)]">
            <button
              type="button"
              onClick={handleOpenFilePicker}
              disabled={inputDisabled}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
              className="min-h-[44px] min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#1e293b] placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#c2c8d3] transition hover:text-slate-600"
              aria-label="Emoji"
              disabled
            >
              <FiSmile className="text-[17px]" />
            </button>
            <button
              type="button"
              onClick={handleOpenFilePicker}
              disabled={inputDisabled}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#c2c8d3] transition hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
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
          {!wsConnected && (
            <div className="mt-2 text-center text-red-500 text-sm">
              Disconnected from server. Reconnecting...
            </div>
          )}
        </form>
      </section>
    </PortalLayout>
  );
}
