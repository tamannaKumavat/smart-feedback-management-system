import { useRef, useState } from "react";
import { FiPaperclip, FiSend, FiSmile } from "react-icons/fi";
import { FaRegShareFromSquare } from "react-icons/fa6";
import PortalLayout from "../../layouts/PortalLayout.jsx";
import { clientChatDummyData } from "../../data/clientChatDummyData.js";

export default function ClientCreateFeedback() {
  const userAvatar = "/user.png";
  const assistantAvatar = "/ruag-single.png";
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState(clientChatDummyData);
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);

  function handleOpenFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    setAttachedFile(file ?? null);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedInput = messageInput.trim();
    if (!trimmedInput && !attachedFile) return;

    const now = "Now";
    setMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        role: "user",
        author: "You",
        avatarUrl: userAvatar,
        time: now,
        text: trimmedInput || `Attached: ${attachedFile?.name}`,
      },
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        author: "RUAG AI Assistant",
        avatarUrl: assistantAvatar,
        time: now,
        text: "Thanks. This is a dummy AI response for the demo chat page.",
      },
    ]);
    setMessageInput("");
    setAttachedFile(null);
  }

  return (
    <PortalLayout mode="client">
      <section className="mx-auto flex h-[calc(100vh-8rem)] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-[#F3F4F6] bg-gradient-to-br from-[#EEF4FF] via-[#F8FAFF] to-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-2px_rgba(0,0,0,0.04)]">
        <header className="flex items-center justify-between border-b border-[#d8dce4] bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-[26px] font-semibold text-[#0f172a]">
              Ruag AI Assistant
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* <button
              type="button"
              className="rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-[13px] font-medium text-[#111827] shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            >
              Configuration
            </button> */}
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-[13px] font-medium text-[#111827] shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            >
              <FaRegShareFromSquare className="text-[14px]" />
              Share
            </button>
            <button
              type="button"
              className="rounded-full bg-[#020c3d] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.18)]"
            >
              New Chat
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto  px-5 py-6">
          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <article
                key={message.id}
                className={isUser ? "ml-auto w-fit" : "w-fit"}
              >
                <p
                  className={`mb-2 text-[14px] font-semibold leading-none text-[#101827] ${
                    isUser ? "text-right" : "pl-12"
                  }`}
                >
                  {message.author}, {message.time}
                </p>
                <div
                  className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser ? (
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[#d8dce4] bg-white">
                      {message.avatarUrl ? (
                        <img
                          src={message.avatarUrl}
                          alt={message.author}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                  ) : null}
                  <div
                    className={`max-w-[560px] rounded-2xl border px-5 py-4 shadow-[0_1px_0_rgba(16,24,40,0.04)] ${
                      isUser
                        ? "rounded-br-md border-[#d6dceb] bg-[#DDE2F2] text-[#1f2a44]"
                        : "rounded-bl-md border-[#d8dce4] bg-white text-[#111827]"
                    }`}
                  >
                    <p className="text-bodysmall leading-relaxed">
                      {message.text}
                    </p>
                  </div>
                  {isUser ? (
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[#d8dce4] bg-white">
                      {message.avatarUrl ? (
                        <img
                          src={message.avatarUrl}
                          alt={message.author}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-[#6b7280]">
                          Y
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}

          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#c2c8d3]">
              <span className="text-sm">...</span>
            </div>
            <p className="text-bodysmall font-medium text-[#111827]">
              RUAG is typing
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border-t border-[#F3F4F6]/80 bg-transparent px-4 pb-4 pt-2">
          {attachedFile ? (
            <div className="mb-3 inline-flex items-center rounded-full bg-[#DDE2F2] px-3 py-1 text-captionsmall text-[#1f2a44]">
              {attachedFile.name}
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="ml-2 text-[#1f2a44]/70 hover:text-[#1f2a44]"
              >
                x
              </button>
            </div>
          ) : null}

          <div className="flex items-center gap-1 rounded-2xl border border-[#e7e9ef] bg-white px-4 py-2 shadow-[0_1px_1px_rgba(16,24,40,0.04)]">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              type="text"
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              placeholder="Write your message..."
              className="w-full bg-transparent text-bodysmall text-content placeholder:text-content-muted focus:outline-none"
            />
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-content-muted/70 transition hover:text-content"
              aria-label="Emoji"
              title="Emoji"
            >
              <FiSmile className="text-[17px] text-[#c2c8d3]" />
            </button>
            <button
              type="button"
              onClick={handleOpenFilePicker}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-content-muted/70 transition hover:text-content"
              aria-label="Attach file"
              title="Attach file"
            >
              <FiPaperclip className="text-[17px] text-[#c2c8d3]" />
            </button>
            <button
              type="submit"
              className="inline-flex h-10 w-20 items-center justify-center rounded-2xl bg-[#020c3d] text-white transition hover:bg-[#0d9488]"
              aria-label="Send message"
              title="Send message"
            >
              <FiSend className="text-[18px]" />
            </button>
          </div>
        </form>
      </section>
    </PortalLayout>
  );
}
