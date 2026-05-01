import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaRegShareFromSquare } from "react-icons/fa6";
import { FiPaperclip, FiPlus, FiSend, FiSmile, FiX } from "react-icons/fi";
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
import { showError, showSuccess } from "../../lib/toast.js";
import { initWebSocket, sendWebSocketMessage, isWebSocketReady, closeWebSocket } from "../../lib/chatWS";

// --- Constants ---
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
const btnYes = "rounded-full bg-[#3E8E91] px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:brightness-[0.95]";
const btnNo = "rounded-full border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50";
const scrollPretty = "[scrollbar-width:thin] [scrollbar-color:rgb(203_213_225/0.65)_transparent] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/40 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/50";

// --- Helper Components ---
function AttachmentChip({ attachment }) {
  const href = attachmentDownloadUrl(attachment.id);
  const isImage = attachment.mimeType?.startsWith("image/");
  if (isImage) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block max-w-[260px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <img src={href} alt={attachment.filename} className="block max-h-48 w-full object-cover" loading="lazy" />
        <div className="flex items-center justify-between gap-2 px-2 py-1 text-[11px] text-slate-500">
          <span className="truncate">{attachment.filename}</span>
          <span className="shrink-0">{formatBytes(attachment.sizeBytes)}</span>
        </div>
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-100">
      <FiPaperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate font-medium">{attachment.filename}</span>
      <span className="shrink-0 text-slate-400">{formatBytes(attachment.sizeBytes)}</span>
    </a>
  );
}

function Avatar({ src, label }) {
  return (
    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[#d8dce4] bg-white">
      {src ? <img src={src} alt={label} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-[#6b7280]">{label?.[0] ?? "?"}</div>}
    </div>
  );
}

// --- Main Component ---
export default function ClientCreateTicketWS() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const resumeId = searchParams.get("chatId");

  // --- State ---
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streamingDraft, setStreamingDraft] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [uploading, setUploading] = useState(false);

  const scrollRef = useRef(null);
  const chatRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- Initialize WebSocket ---
  useEffect(() => {
    initWebSocket(
      (data) => {
        // Handle incoming messages
        if (data.type === "token") {
          setStreamingDraft((prev) => ({
            ...prev,
            content: (prev?.content || "") + data.token,
          }));
        } else if (data.type === "message") {
          setMessages((prev) => [...prev, data.message]);
          setStreamingDraft(null);
          setSending(false);
        } else if (data.type === "error") {
          showError(data.error, "WebSocket error");
          setStreamingDraft(null);
          setSending(false);
        }
      },
      (error) => {
        showError(error.message, "WebSocket error");
      },
      () => {
        setSending(false);
      }
    );

    return () => {
      closeWebSocket();
    };
  }, []);

  // --- Load or resume chat ---
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
        const [resumed, history] = await Promise.all([resumeChat(resumeId), getMessages(resumeId)]);
        if (cancelled) return;
        setChat(resumed.chat);
        setMessages(history.messages || []);
        setStreamingDraft(null);
      } catch (err) {
        if (cancelled) return;
        showError(err, "Could not resume chat");
        setSearchParams({}, { replace: true });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [resumeId, setSearchParams]);

  // --- Auto-scroll ---
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, streamingDraft]);

  // --- Helper Functions ---
  const ensureChat = useCallback(async () => {
    if (chat) return chat;
    const created = await createChat();
    setChat(created.chat);
    return created.chat;
  }, [chat]);

  const handleOpenFilePicker = () => fileInputRef.current?.click();

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isAllowedMime(file.type)) {
      showError("Only images, PDFs and text files are supported as attachments.");
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      showError(`Files must be smaller than ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    setPendingFile(file);
  };

  // --- Submit Message (WebSocket) ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = messageInput.trim();
    if ((!trimmed && !pendingFile) || sending) return;
    if (chat?.status === "closed") {
      showError("This chat is closed. Start a new one.");
      return;
    }
    if (chat?.status === "waiting_confirmation") {
      showError("Please confirm or reject the summary above first.");
      return;
    }

    // --- Check WebSocket ---
    if (!isWebSocketReady()) {
      showError("WebSocket is not connected. Please wait and try again.", "Connection error");
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
      showError(err, "Could not start chat");
      return;
    }

    let attachmentIds = [];
    if (fileToSend) {
      setUploading(true);
      try {
        const att = await uploadAttachment({ chatId: activeChat.id, file: fileToSend });
        attachmentIds = [att.id];
      } catch (err) {
        setUploading(false);
        setSending(false);
        showError(err, "Upload failed");
        setPendingFile(fileToSend);
        return;
      } finally {
        setUploading(false);
      }
    }

    // Add user message to UI immediately
    const newUserMessage = {
      id: `local-${Date.now()}`,
      chatId: activeChat.id,
      sender: "user",
      content: contentToSend,
      attachmentIds,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    // Send to WebSocket
    const success = sendWebSocketMessage({
      type: "user_message",
      chatId: activeChat.id,
      content: contentToSend,
      attachmentIds,
    });

    if (success) {
      setStreamingDraft({ id: "streaming", content: "" });
    } else {
      setSending(false);
    }
  };

  // --- Confirm Summary ---
  const handleConfirm = async (accepted) => {
    if (!chat || confirming) return;
    setConfirming(true);
    try {
      const result = await confirmSummary(chat.id, accepted);
      setChat(result.chat);
      if (accepted && result.ticket) {
        showSuccess("Ticket created");
        setMessages((prev) => [...prev, {
          id: `local-${Date.now()}`,
          chatId: chat.id,
          sender: "ai",
          content: "Thank you for confirming. Your ticket is now in progress. You can follow the status on your dashboard.",
          aiAnswerType: "normal",
          createdAt: new Date().toISOString(),
        }]);
      } else if (!accepted) {
        setMessages((prev) => [...prev, {
          id: `local-${Date.now()}`,
          chatId: chat.id,
          sender: "ai",
          content: "No problem. Tell me what we should change and I’ll update the summary.",
          aiAnswerType: "normal",
          createdAt: new Date().toISOString(),
        }]);
      }
    } catch (err) {
      showError(err, "Could not record your choice");
    } finally {
      setConfirming(false);
    }
  };

  // --- New Chat ---
  const handleNewChat = () => {
    if (chat && (chat.status === "active" || chat.status === "waiting_confirmation")) {
      markChatAsDraft(chat.id);
    }
    setChat(null);
    setMessages([]);
    setStreamingDraft(null);
    setMessageInput("");
    setPendingFile(null);
    if (resumeId) setSearchParams({}, { replace: true });
  };

  // --- Share Chat ---
  const handleShare = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: "Create Ticket", url }).catch(() => {});
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      showSuccess("Link copied");
    }
  };

  // --- Render Message ---
  const renderMessage = (msg) => {
    const isUser = msg.sender === "user";
    const time = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "";
    const showConfirm = !isUser && msg.aiAnswerType === "summary" && msg.id === latestSummaryId && chat?.status === "waiting_confirmation";

    return (
      <article key={msg.id} className={isUser ? "ml-auto w-full max-w-[min(100%,560px)]" : "w-full max-w-[min(100%,560px)]"}>
        <p className={`mb-2 text-[14px] font-semibold leading-none text-[#101827] ${isUser ? "text-right pr-11" : "pl-12"}`}>
          {isUser ? "You" : "Ruag Team"}{time ? `, ${time}` : ""}
        </p>
        <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
          {!isUser ? <Avatar src={teamAvatar} label="Ruag Team" /> : null}
          <div className={`max-w-[560px] ${isUser ? bubbleUser : bubbleTeam} whitespace-pre-wrap`}>
            {showConfirm ? (
              <>
                <p className="text-[13px] text-slate-700">Here’s how I understand your request. Please confirm before I open the ticket.</p>
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Summary</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-slate-800">{msg.content}</p>
                </div>
                <p className="mt-3 text-[13px] text-slate-700">Do you confirm this is correct?</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className={`${btnNo} ${confirming ? "pointer-events-none opacity-45" : ""}`} onClick={() => handleConfirm(false)} disabled={confirming}>No</button>
                  <button type="button" className={`${btnYes} ${confirming ? "pointer-events-none opacity-45" : ""}`} onClick={() => handleConfirm(true)} disabled={confirming}>Yes</button>
                </div>
              </>
            ) : (
              <>
                <p>{msg.content}</p>
                {msg.attachments?.length ? (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {msg.attachments.map((att) => <AttachmentChip key={att.id} attachment={att} />)}
                  </div>
                ) : null}
              </>
            )}
          </div>
          {isUser ? <Avatar src={userAvatar} label="You" /> : null}
        </div>
      </article>
    );
  };

  // --- Render Streaming Draft ---
  const renderStreaming = () => {
    if (!streamingDraft) return null;
    return (
      <article className="w-full max-w-[min(100%,560px)]">
        <p className="mb-2 pl-12 text-[14px] font-semibold leading-none text-[#101827]">Ruag Team</p>
        <div className="flex items-end gap-2 justify-start">
          <Avatar src={teamAvatar} label="Ruag Team" />
          <div className={`max-w-[560px] ${bubbleTeam} whitespace-pre-wrap`}>
            {streamingDraft.content || (
              <span className="inline-flex gap-1 text-slate-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:240ms]" />
              </span>
            )}
          </div>
        </div>
      </article>
    );
  };

  // --- Latest Summary ID ---
  const latestSummaryId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.sender === "ai" && m.aiAnswerType === "summary") return m.id;
    }
    return null;
  }, [messages]);

  // --- UI State ---
  const awaitingConfirmation = chat?.status === "waiting_confirmation";
  const chatClosed = chat?.status === "closed";
  const placeholderText = chat
    ? chatClosed
      ? "This chat is closed. Click ‘New Chat’ to start another."
      : awaitingConfirmation
        ? "Please answer Yes or No above to continue."
        : "Write your message..."
    : "Describe your issue to start a new chat...";

  const inputDisabled = sending || chatClosed || awaitingConfirmation;

  // --- Render ---
  return (
    <PortalLayout mode="client">
      <section className="mx-auto flex h-[calc(100dvh-6rem)] max-h-[calc(100dvh-6rem)] min-h-0 w-full max-w-[920px] flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        {/* --- Header --- */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/90 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <h1 className="text-[18px] font-semibold leading-tight text-[#0f172a] sm:text-[20px]">Create Ticket</h1>
            {chat ? <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-600">{chat.status.replace("_", " ")}</span> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => navigate("/client/drafts")} className="inline-flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-[13px] font-medium text-[#111827] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:bg-slate-50">Drafts</button>
            <button type="button" onClick={handleShare} className="inline-flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-[13px] font-medium text-[#111827] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:bg-slate-50">
              <FaRegShareFromSquare className="text-[14px]" aria-hidden /> Share
            </button>
            <button type="button" onClick={handleNewChat} className="rounded-full bg-[#020c3d] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.18)] transition hover:bg-[#0a1a5c]">New Chat</button>
          </div>
        </header>

        {/* --- Messages --- */}
        <div ref={scrollRef} className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[#F5F7FA] to-white p-4 ${scrollPretty}`}>
          <div className="mx-auto max-w-[920px] space-y-5">
            {messages.length === 0 && !streamingDraft ? (
              <div className="mt-12 text-center text-slate-500">
                <p className="text-[14px]">Start by describing the problem you’re facing. The assistant will help you draft a ticket.</p>
                <p className="mt-2 text-[12px] text-slate-400">Tip: ask for a “summary” when you’re ready to open the ticket.</p>
              </div>
            ) : null}
            {messages.map(renderMessage)}
            {renderStreaming()}
          </div>
        </div>

        {/* --- Input --- */}
        <form onSubmit={handleSubmit} className="shrink-0 border-t border-slate-200/90 bg-white px-4 pb-4 pt-3 sm:px-6">
          <input ref={fileInputRef} type="file" onChange={handleFileChange} accept="image/*,application/pdf,text/*" className="hidden" />
          {pendingFile ? (
            <div className="mx-auto mb-2 flex max-w-[720px] items-center justify-end">
              <span className="inline-flex max-w-full items-center gap-2 truncate rounded-full bg-[#E7F3FF] px-3 py-1 text-[12px] font-medium text-[#1e293b] ring-1 ring-sky-200/40">
                <FiPaperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{pendingFile.name}</span>
                <span className="shrink-0 text-slate-500">{formatBytes(pendingFile.size)}</span>
                <button type="button" onClick={() => setPendingFile(null)} className="text-slate-500 hover:text-slate-800" aria-label="Remove attachment">
                  <FiX className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          ) : null}
          <div className="mx-auto flex max-w-[720px] items-center gap-1 rounded-2xl border border-[#e7e9ef] bg-white px-3 py-2 shadow-[0_1px_1px_rgba(16,24,40,0.04)]">
            <button type="button" onClick={handleOpenFilePicker} disabled={inputDisabled} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Add attachment" title="Attach an image, PDF or text file">
              <FiPlus className="h-5 w-5" strokeWidth={2} />
            </button>
            <label className="sr-only" htmlFor="create-ticket-message">Write your message</label>
            <input
              id="create-ticket-message"
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={uploading ? "Uploading attachment..." : placeholderText}
              disabled={inputDisabled}
              className="min-h-[44px] min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#1e293b] placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
            />
            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#c2c8d3] transition hover:text-slate-600" aria-label="Emoji" disabled>
              <FiSmile className="text-[17px]" />
            </button>
            <button type="button" onClick={handleOpenFilePicker} disabled={inputDisabled} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#c2c8d3] transition hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Attach file">
              <FiPaperclip className="text-[17px]" />
            </button>
            <button type="submit" disabled={inputDisabled || (!messageInput.trim() && !pendingFile)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#020c3d] text-white shadow-sm transition hover:bg-[#0a1a5c] disabled:cursor-not-allowed disabled:opacity-50" aria-label="Send message">
              <FiSend className="text-[18px]" />
            </button>
          </div>
        </form>
      </section>
    </PortalLayout>
  );
}