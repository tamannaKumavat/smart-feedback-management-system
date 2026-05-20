import { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import MarkdownMessage from "../../MarkdownMessage.jsx";
import { useTranslation } from "@/i18n/useTranslation.js";
import { getMessages } from "../../../lib/chatApi.js";
import { showError } from "../../../lib/toast.js";

const userAvatar = "/user.png";
const teamAvatar = "/ruag-single.png";

const bubbleUser =
  "client-chat-bubble-user rounded-2xl rounded-br-md px-4 py-2.5 text-[13px] leading-relaxed shadow-sm";
const bubbleTeam =
  "client-chat-bubble-team rounded-2xl rounded-bl-md px-4 py-2.5 text-[13px] leading-relaxed shadow-sm";

const scrollPretty =
  "[scrollbar-width:thin] [scrollbar-color:rgb(100_116_139/0.45)_transparent] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-input/60 hover:[&::-webkit-scrollbar-thumb]:bg-content-muted/50";

function formatTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function Avatar({ src, label }) {
  return (
    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border-subtle bg-surface-card">
      {src ? (
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-content-muted">
          {label?.[0] ?? "?"}
        </div>
      )}
    </div>
  );
}

function HistoryMessage({ msg, t }) {
  const isUser = msg.sender === "user";
  const time = formatTime(msg.createdAt);

  return (
    <div
      className={`client-chat-row flex w-full ${
        isUser ? "client-chat-row--user" : "client-chat-row--team"
      }`}
    >
      <article
        className={`flex max-w-[min(85%,32rem)] flex-col gap-1.5 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <p
          className={`text-[12px] leading-none ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          <span className="font-semibold text-dashboard-heading">
            {isUser ? t("common.you") : t("common.ruagTeam")}
          </span>
          {time ? <span className="text-content-muted"> · {time}</span> : null}
        </p>
        <div
          className={`flex max-w-full items-end gap-2.5 ${
            isUser ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <Avatar
            src={isUser ? userAvatar : teamAvatar}
            label={isUser ? t("common.you") : t("common.ruagTeam")}
          />
          <div
            className={`min-w-0 max-w-full ${isUser ? bubbleUser : bubbleTeam}`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{msg.content}</p>
            ) : (
              <MarkdownMessage>{msg.content}</MarkdownMessage>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

export default function ChatHistoryModal({ open, issueId, issueTitle, onClose }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!open || !issueId) {
      setMessages([]);
      return undefined;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getMessages(issueId);
        if (!cancelled) setMessages(data.messages || []);
      } catch (err) {
        if (!cancelled) {
          showError(err, t("chatHistory.loadError"));
          onClose?.();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open, issueId, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-history-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-[3px]"
        aria-label={t("chatHistory.closeOverlay")}
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(88dvh,720px)] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-card shadow-card">
        <header className="client-separator flex shrink-0 items-start justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2
              id="chat-history-title"
              className="text-[16px] font-semibold text-dashboard-heading"
            >
              {t("chatHistory.title")}
            </h2>
            {issueTitle ? (
              <p className="mt-0.5 truncate text-[13px] text-content-muted">
                {issueTitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-content-muted transition hover:bg-surface-muted hover:text-content"
            aria-label={t("common.close")}
          >
            <FiX className="text-[18px]" />
          </button>
        </header>

        <div
          className={`min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 ${scrollPretty}`}
          style={{ background: "var(--client-chat-area)" }}
        >
          {loading ? (
            <p className="py-8 text-center text-[13px] text-content-muted">
              {t("chatHistory.loading")}
            </p>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-content-muted">
              {t("chatHistory.empty")}
            </p>
          ) : (
            <div className="space-y-5">
              {messages.map((msg) => (
                <HistoryMessage key={msg.id} msg={msg} t={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
