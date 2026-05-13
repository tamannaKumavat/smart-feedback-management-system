import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaRegShareFromSquare } from "react-icons/fa6";
import { FiPaperclip, FiPlus, FiSend, FiSmile, FiX } from "react-icons/fi";
import PortalLayout from "../../layouts/PortalLayout.jsx";
import { attachmentDownloadUrl, uploadAttachment } from "../../lib/chatApi.js";
import { showError, showSuccess } from "../../lib/toast.js";

/*
Still todo: 
- create a chat like its expected with our chat api
- restore old chats
- send chat id to websocket 
- Fix issue of disconnecting and then reconnecting again the websocket!
*/

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

const bubbleUser = "rounded-[18px] bg-[#E7F3FF] px-4 py-2.5 text-[13px] leading-relaxed text-[#1e293b] shadow-sm ring-1 ring-sky-200/40";
const bubbleTeam = "rounded-[18px] bg-white px-4 py-2.5 text-[13px] leading-relaxed text-[#1e293b] shadow-sm ring-1 ring-slate-200/90";
const scrollPretty = "[scrollbar-width:thin] [scrollbar-color:rgb(203_213_225/0.65)_transparent] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/40 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/50";

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

export default function ClientCreateTicket() {
  const navigate = useNavigate();

  // State
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

  // Connect WebSocket on mount
  useEffect(() => {
    const wsUrl = `ws://${window.location.hostname}:8000/ws/chat`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] Connected");
      setWsConnected(true);
      setAiWaitingForInput(true);
      showSuccess("Connected to server");
    };

    ws.onmessage = (e) => {
      console.log("[WS] Message received:", e.data);
      try {
        const data = JSON.parse(e.data);

        // Handle interrupt: AI is waiting for user input
        if (data.type === "interrupt") {
          setAiWaitingForInput(true);
          setMessages((prev) => [...prev, {
            id: `ai-${Date.now()}`,
            sender: "ai",
            content: data.token,
            aiAnswerType: "normal",
            createdAt: new Date().toISOString(),
          }]);
        }
        // Handle token streaming
        else if (data.type === "token") {
          setAiWaitingForInput(false);
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.sender === "ai") {
              return [
                ...prev.slice(0, -1),
                { ...lastMsg, content: (lastMsg.content || "") + data.token },
              ];
            } else {
              return [...prev, {
                id: `ai-${Date.now()}`,
                sender: "ai",
                content: data.token,
                aiAnswerType: "normal",
                createdAt: new Date().toISOString(),
              }];
            }
          });
        }
        // Handle full messages
        else if (data.type === "message" && data.message) {
          setAiWaitingForInput(false);
          setMessages((prev) => [...prev, {
            id: data.message.id || `ai-${Date.now()}`,
            sender: data.message.sender || "ai",
            content: data.message.content,
            aiAnswerType: data.message.aiAnswerType || "normal",
            createdAt: data.message.createdAt || new Date().toISOString(),
            attachments: data.message.attachments || [],
          }]);
        }         else if (data.type === "message" && data.token) {
          setAiWaitingForInput(false);
          setMessages((prev) => [...prev, {
            id: `ai-${Date.now()}`,
            sender: "ai",
            content: data.token,
            aiAnswerType: "normal",
            createdAt: new Date().toISOString(),
          }]);
        }
        // Handle other JSON messages
        else {
          setMessages((prev) => [...prev, {
            id: `ai-${Date.now()}`,
            sender: "ai",
            content: JSON.stringify(data),
            aiAnswerType: "normal",
            createdAt: new Date().toISOString(),
          }]);
        }
      } catch (err) {
        // Raw text fallback
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
      showError(`WebSocket error: ${error.message || error}`);
      setWsConnected(false);
    };

    ws.onclose = () => {
      console.log("[WS] Disconnected");
      showError("Disconnected from server. Reconnecting...");
      setWsConnected(false);
      setAiWaitingForInput(false);
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          const newWs = new WebSocket(wsUrl);
          wsRef.current = newWs;
          newWs.onopen = () => {
            setWsConnected(true);
            setAiWaitingForInput(true);
          };
          newWs.onerror = (err) => console.error("[WS] Reconnect error:", err);
        }
      }, 5000);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

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
  const handleNewChat = () => {
    setMessageInput("");
    setPendingFile(null);
    setAiWaitingForInput(true);
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
          {isUser ? "You" : "Ruag Team"}
          {time ? `, ${time}` : ""}
        </p>
        <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
          {!isUser ? <Avatar src={teamAvatar} label="Ruag Team" /> : null}
          <div className={`max-w-[560px] ${isUser ? bubbleUser : bubbleTeam} whitespace-pre-wrap`}>
            <p>{msg.content}</p>
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

  // Input field is disabled if:
  // - WebSocket is not connected
  // - AI is not waiting for input
  // - User is sending a message
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

        <div
          ref={scrollRef}
          className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[#F5F7FA] to-white p-4 ${scrollPretty}`}
        >
          <div className="mx-auto max-w-[920px] space-y-5">
            {messages.length === 0 ? (
              <div className="mt-12 text-center text-slate-500">
                <p className="text-[14px]">Start by describing your issue.</p>
              </div>
            ) : null}
            {messages.map(renderMessage)}
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