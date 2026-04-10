import { useEffect, useRef, useState } from "react";
import { FaRegShareFromSquare } from "react-icons/fa6";
import { FiPaperclip, FiPlus, FiSend, FiSmile } from "react-icons/fi";
import PortalLayout from "../../layouts/PortalLayout.jsx";
import { createTicketChatSeed } from "../../data/clientChatDummyData.js";

const userAvatar = "/user.png";
const teamAvatar = "/ruag-single.png";

const bubbleUser =
  "rounded-[18px] bg-[#E7F3FF] px-4 py-2.5 text-[13px] leading-relaxed text-[#1e293b] shadow-sm ring-1 ring-sky-200/40";
const bubbleTeam =
  "rounded-[18px] bg-white px-4 py-2.5 text-[13px] leading-relaxed text-[#1e293b] shadow-sm ring-1 ring-slate-200/90";
const btnYes =
  "rounded-full bg-[#3E8E91] px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:brightness-[0.95]";
const btnNo =
  "rounded-full border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50";
const linkAttach = "text-[12px] font-medium text-[#3E8E91] hover:underline";
const scrollPretty =
  "[scrollbar-width:thin] [scrollbar-color:rgb(203_213_225/0.65)_transparent] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/40 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/50";

function formatNowTime() {
  return new Date().toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClientCreateTicket() {
  const [messages, setMessages] = useState(() => [...createTicketChatSeed]);
  const [messageInput, setMessageInput] = useState("");
  const [attachedFile, setAttachedFile] = useState(null);
  const [confirmationDone, setConfirmationDone] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function handleOpenFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    setAttachedFile(file ?? null);
  }

  function handleNewChat() {
    setMessages([...createTicketChatSeed]);
    setConfirmationDone(false);
    setMessageInput("");
    setAttachedFile(null);
  }

  function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: "Create Ticket", url }).catch(() => {});
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
    }
  }

  function handleConfirm(choice) {
    if (confirmationDone) return;
    const t = formatNowTime();
    const tail =
      choice === "yes"
        ? [
            {
              kind: "message",
              id: `confirm-u-${Date.now()}`,
              role: "user",
              author: "You",
              time: t,
              text: "Yes",
              short: true,
            },
            {
              kind: "message",
              id: `confirm-s-${Date.now()}`,
              role: "assistant",
              author: "Ruag Team",
              time: t,
              text: "Thank you for confirming. Your ticket is now in progress. You can follow the status on your dashboard.",
            },
          ]
        : [
            {
              kind: "message",
              id: `confirm-u-${Date.now()}`,
              role: "user",
              author: "You",
              time: t,
              text: "No",
              short: true,
            },
            {
              kind: "message",
              id: `confirm-s-${Date.now()}`,
              role: "assistant",
              author: "Ruag Team",
              time: t,
              text: "No problem. Please reply with what we should change in the summary, and we’ll update the ticket before moving forward.",
            },
          ];
    setMessages((prev) => [...prev, ...tail]);
    setConfirmationDone(true);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedInput = messageInput.trim();
    if (!trimmedInput && !attachedFile) return;

    const t = formatNowTime();
    const userLine = {
      kind: "message",
      id: `u-${Date.now()}`,
      role: "user",
      author: "You",
      time: t,
      text: trimmedInput || `Attached: ${attachedFile?.name}`,
      file: attachedFile ? attachedFile.name : undefined,
    };
    const assistantLine = {
      kind: "message",
      id: `a-${Date.now()}`,
      role: "assistant",
      author: "Ruag Team",
      time: t,
      text: "Thanks, we’ve logged your message. A specialist will follow up here shortly.",
    };
    setMessages((prev) => [...prev, userLine, assistantLine]);
    setMessageInput("");
    setAttachedFile(null);
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

  return (
    <PortalLayout mode="client">
      <section className="mx-auto flex h-[calc(100dvh-6rem)] max-h-[calc(100dvh-6rem)] min-h-0 w-full max-w-[920px] flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/90 bg-white px-4 py-3 sm:px-5">
          <h1 className="text-[18px] font-semibold leading-tight text-[#0f172a] sm:text-[20px]">
            Create Ticket
          </h1>
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
            {messages.map((item) => {
              if (item.kind === "date") {
                return (
                  <div key={item.id} className="flex justify-center py-1">
                    <span className="rounded-full bg-[#E8F4FD] px-4 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-sky-100">
                      {item.label}
                    </span>
                  </div>
                );
              }

              if (item.kind === "confirmation") {
                return (
                  <div key={item.id} className="w-full">
                    <p className="mb-2 pl-12 text-[14px] font-semibold leading-none text-[#101827]">
                      {item.author}, {item.time}
                    </p>
                    <div className="flex items-end gap-2">
                      <Avatar src={teamAvatar} label="Ruag Team" />
                      <div className={`max-w-[min(100%,520px)] ${bubbleTeam}`}>
                        {item.intro ? <p>{item.intro}</p> : null}
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Summary
                          </p>
                          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-800">
                            {item.summary}
                          </p>
                        </div>
                        <p className="mt-3 text-[13px] text-slate-700">
                          Do you confirm this is correct?
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={`${btnNo} ${confirmationDone ? "pointer-events-none opacity-45" : ""}`}
                            onClick={() => handleConfirm("no")}
                            disabled={confirmationDone}
                          >
                            No
                          </button>
                          <button
                            type="button"
                            className={`${btnYes} ${confirmationDone ? "pointer-events-none opacity-45" : ""}`}
                            onClick={() => handleConfirm("yes")}
                            disabled={confirmationDone}
                          >
                            Yes
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (item.kind === "message") {
                const isUser = item.role === "user";
                const short = item.short;

                return (
                  <article
                    key={item.id}
                    className={
                      isUser
                        ? "ml-auto w-full max-w-[min(100%,560px)]"
                        : "w-full max-w-[min(100%,560px)]"
                    }
                  >
                    <p
                      className={`mb-2 text-[14px] font-semibold leading-none text-[#101827] ${
                        isUser ? "text-right pr-11" : "pl-12"
                      }`}
                    >
                      {item.author}, {item.time}
                    </p>
                    <div
                      className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser ? (
                        <Avatar src={teamAvatar} label="Ruag Team" />
                      ) : null}
                      <div
                        className={`max-w-[560px] ${isUser ? bubbleUser : bubbleTeam} ${short ? "!rounded-full px-5 py-2" : ""}`}
                      >
                        {item.text ? <p>{item.text}</p> : null}
                        {item.file ? (
                          <a
                            href="#attachment"
                            className={`mt-2 inline-flex items-center gap-1.5 ${linkAttach}`}
                            onClick={(e) => e.preventDefault()}
                          >
                            <FiPaperclip
                              className="h-3.5 w-3.5 shrink-0"
                              aria-hidden
                            />
                            {item.file}
                          </a>
                        ) : null}
                      </div>
                      {isUser ? <Avatar src={userAvatar} label="You" /> : null}
                    </div>
                  </article>
                );
              }

              return null;
            })}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="shrink-0 border-t border-slate-200/90 bg-white px-4 pb-4 pt-3 sm:px-6"
        >
          {attachedFile ? (
            <div className="mx-auto mb-2 flex max-w-[720px] items-center justify-end">
              <span className="inline-flex max-w-full items-center truncate rounded-full bg-[#E7F3FF] px-3 py-1 text-[12px] font-medium text-[#1e293b] ring-1 ring-sky-200/40">
                {attachedFile.name}
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="ml-2 text-slate-500 hover:text-slate-800"
                  aria-label="Remove attachment"
                >
                  ×
                </button>
              </span>
            </div>
          ) : null}
          <div className="mx-auto flex max-w-[720px] items-center gap-1 rounded-2xl border border-[#e7e9ef] bg-white px-3 py-2 shadow-[0_1px_1px_rgba(16,24,40,0.04)]">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleOpenFilePicker}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-50"
              aria-label="Add attachment"
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
              placeholder="Write your message..."
              className="min-h-[44px] min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#1e293b] placeholder:text-slate-400 focus:outline-none focus:ring-0"
            />
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#c2c8d3] transition hover:text-slate-600"
              aria-label="Emoji"
            >
              <FiSmile className="text-[17px]" />
            </button>
            <button
              type="button"
              onClick={handleOpenFilePicker}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#c2c8d3] transition hover:text-slate-600"
              aria-label="Attach file"
            >
              <FiPaperclip className="text-[17px]" />
            </button>
            <button
              type="submit"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#020c3d] text-white shadow-sm transition hover:bg-[#0a1a5c]"
              aria-label="Send message"
            >
              <FiSend className="text-[18px]" />
            </button>
          </div>
        </form>
      </section>
    </PortalLayout>
  );
}
