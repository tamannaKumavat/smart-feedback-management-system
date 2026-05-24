import { useMemo, useState, useEffect } from "react";
import {
  FiArrowLeft,
  FiEdit3,
  FiMoreHorizontal,
  FiPaperclip,
  FiPlus,
  FiSearch,
  FiSend,
  FiStar,
  FiVideo,
} from "react-icons/fi";
import { IoTicketOutline } from "react-icons/io5";
import { useTranslation } from "@/i18n/useTranslation.js";
import MarkdownMessage from "../../MarkdownMessage.jsx";
import { useMediaQuery } from "../../../lib/useMediaQuery.js";
import {
  confirmationFollowUp,
  getTicketHistoryMessagesForThread,
} from "../../../data/clientTicketHistoryDummy.jsx";

function formatMessageTime() {
  return new Date().toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const hairline = "border-border-subtle";
const inputFocus =
  "focus:border-[var(--client-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--client-accent)]/20";

const scrollPretty =
  "[scrollbar-width:thin] [scrollbar-color:rgb(100_116_139/0.45)_transparent] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-input/60 hover:[&::-webkit-scrollbar-thumb]:bg-content-muted/50";

function TicketAvatar({ title, size = "md" }) {
  const wrap = size === "lg" ? "h-11 w-11" : "h-10 w-10";
  const icon = size === "lg" ? "h-[22px] w-[22px]" : "h-[18px] w-[18px]";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-surface-muted text-[var(--client-accent)] ring-1 ring-border-subtle ${wrap}`}
      title={title}
      aria-hidden={title ? undefined : true}
    >
      <IoTicketOutline className={icon} strokeWidth={2} aria-hidden />
    </div>
  );
}

function PropertyMessageCard({ property, t }) {
  const img =
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=480&q=80&auto=format&fit=crop";
  return (
    <div className="mt-2 max-w-[min(100%,320px)] overflow-hidden rounded-2xl border border-border-subtle bg-surface-card shadow-card">
      <div className="aspect-[16/10] w-full overflow-hidden bg-surface-muted">
        <img
          src={img}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="space-y-2 p-3">
        <div>
          <p className="text-[13px] font-bold text-content">
            {property.title}
          </p>
          <p className="text-[11px] text-content-muted">{property.location}</p>
          <p className="mt-1 text-[15px] font-bold text-content">
            {property.price}
          </p>
        </div>
        <div className="flex gap-3 text-[11px] text-content-muted">
          <span>
            {property.beds} {t("ticketHistory.property.bed")}
          </span>
          <span>
            {property.baths} {t("ticketHistory.property.bath")}
          </span>
          <span>{property.areaSqft} ft²</span>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-border-subtle pt-2 text-[10px]">
          <div>
            <p className="text-content-muted">
              {t("ticketHistory.property.tokenPrice")}
            </p>
            <p className="font-semibold text-content">
              {property.tokenPrice}
            </p>
          </div>
          <div>
            <p className="text-content-muted">
              {t("ticketHistory.property.projectedIrr")}
            </p>
            <p className="font-semibold text-content">{property.irr}</p>
          </div>
          <div>
            <p className="text-content-muted">
              {t("ticketHistory.property.projectedApr")}
            </p>
            <p className="font-semibold text-content">{property.apr}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function localizeSender(t, sender) {
  if (sender === "You") return t("common.you");
  if (sender === "Ruag team" || sender === "Ruag Team") return t("common.ruagTeam");
  return sender;
}

export default function TicketHistory({
  threads = [],
  messagesByThread = {},
  sortOptions = [],
}) {
  const { t } = useTranslation();
  const isMobileLayout = useMediaQuery("(max-width: 1023px)");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(sortOptions[0]?.value ?? "newest");
  const [activeId, setActiveId] = useState(threads[0]?.id ?? "");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [confirmationChoice, setConfirmationChoice] = useState({});
  const [replyByThread, setReplyByThread] = useState({});
  const [sentFromComposer, setSentFromComposer] = useState({});

  useEffect(() => {
    if (!isMobileLayout) setMobileDetailOpen(false);
  }, [isMobileLayout]);

  const showThreadList = !isMobileLayout || !mobileDetailOpen;
  const showThreadDetail = !isMobileLayout || mobileDetailOpen;

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = threads.filter((thread) => {
      if (!q) return true;
      const convo = Array.isArray(thread.conversation)
        ? thread.conversation
            .map((c) => {
              const bits = [`${c.content ?? ""}`, `${c.file ?? ""}`];
              if (c.confirmationRequest?.summary)
                bits.push(c.confirmationRequest.summary);
              return bits.join(" ");
            })
            .join(" ")
        : "";
      const hay =
        `${thread.ticketRef ?? ""} ${thread.name ?? ""} ${thread.subject ?? ""} ${thread.category ?? ""} ${thread.preview ?? ""} ${thread.snippet ?? ""} ${convo}`.toLowerCase();
      return hay.includes(q);
    });
    if (sort === "oldest") list = [...list].reverse();
    if (sort === "unread")
      list = [...list].sort((a, b) => (b.unread ?? 0) - (a.unread ?? 0));
    return list;
  }, [threads, query, sort]);

  const active = threads.find((t) => t.id === activeId) ?? threads[0];

  const messages = useMemo(() => {
    if (!active?.id) return [];
    const legacy = messagesByThread[active.id];
    let list = legacy?.length
      ? legacy
      : getTicketHistoryMessagesForThread(active);
    const hasInteractiveConfirmation = active.conversation?.some(
      (turn) => turn.confirmationRequest?.summary,
    );
    const choice = confirmationChoice[active.id];
    if (hasInteractiveConfirmation && (choice === "yes" || choice === "no")) {
      const tail = confirmationFollowUp[choice];
      list = [
        ...list,
        {
          id: `${active.id}-confirm-reply-user`,
          sender: "You",
          outgoing: true,
          time: "10:22",
          type: "text",
          body: tail.userContent,
        },
        {
          id: `${active.id}-confirm-reply-support`,
          sender: "Ruag team",
          outgoing: false,
          time: "10:23",
          type: "text",
          body: tail.supportContent,
        },
      ];
    }

    const sent = sentFromComposer[active.id];
    if (Array.isArray(sent) && sent.length > 0) {
      for (const row of sent) {
        list.push({
          id: row.id,
          sender: "You",
          outgoing: true,
          time: row.time,
          type: "text",
          body: row.body,
        });
      }
    }

    return list;
  }, [active, messagesByThread, confirmationChoice, sentFromComposer]);

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden bg-surface-card md:flex-row">
      <aside
        className={`${showThreadList ? "flex" : "hidden"} max-h-none min-h-0 w-full min-w-0 shrink-0 flex-col bg-surface-card md:flex md:max-h-none md:w-[min(100%,380px)] md:border-r lg:w-[360px] lg:max-w-[360px] ${hairline}`}
      >
        <div
          className="client-separator flex shrink-0 items-center justify-between gap-2 px-4 py-3"
        >
          <h2 className="text-[15px] font-semibold text-content">
            {t("ticketHistory.title")}
          </h2>
          <button
            type="button"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${hairline} bg-surface-card text-content-muted shadow-sm transition hover:border-border-input hover:text-content`}
            aria-label={t("ticketHistory.compose")}
          >
            <FiEdit3 className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>

        <div className="client-separator shrink-0 space-y-2 px-3 py-3">
          <div className="relative">
            <FiSearch
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("common.search")}
              className={`w-full rounded-full border ${hairline} bg-surface-card py-2.5 pl-10 pr-3 text-[13px] text-content placeholder:text-content-muted ${inputFocus}`}
              aria-label={t("ticketHistory.searchMessages")}
            />
          </div>
        </div>

        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${scrollPretty}`}
        >
          {filteredThreads.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-content-muted">
              {t("ticketHistory.noThreads")}
            </p>
          ) : (
            <ul className={`divide-y ${hairline}`}>
              {filteredThreads.map((thread) => {
                const selected = thread.id === active?.id;
                return (
                  <li key={thread.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveId(thread.id);
                        if (isMobileLayout) setMobileDetailOpen(true);
                      }}
                      className={`flex w-full gap-3 px-3 py-3 text-left transition ${
                        selected
                          ? "bg-surface-muted shadow-[inset_3px_0_0_0_var(--client-accent)]"
                          : "hover:bg-surface-muted"
                      }`}
                    >
                      <TicketAvatar title={thread.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-[13px] font-semibold text-content">
                            {thread.name}
                          </p>
                          <span className="shrink-0 text-[11px] text-content-muted">
                            {thread.timeAgo}
                          </span>
                        </div>
                        <p className="truncate text-[12px] font-medium text-content-muted">
                          {thread.subject}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-content-muted">
                          {thread.snippet}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2 text-content-muted">
                          {thread.hasAttachment ? (
                            <FiPaperclip
                              className="h-3.5 w-3.5"
                              aria-label={t("ticketHistory.hasAttachment")}
                            />
                          ) : null}
                          <FiStar
                            className={`h-3.5 w-3.5 ${thread.starred ? "fill-amber-400 text-amber-400" : "text-content-muted/50"}`}
                            aria-label={
                              thread.starred
                                ? t("ticketHistory.starred")
                                : t("ticketHistory.notStarred")
                            }
                          />
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <section
        className={`${showThreadDetail ? "flex" : "hidden"} min-w-0 flex-1 flex-col bg-surface-card md:flex`}
      >
        {active ? (
          <>
            <header
              className="client-separator flex shrink-0 items-center justify-between gap-3 px-3 py-3 sm:px-5"
            >
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                {isMobileLayout ? (
                  <button
                    type="button"
                    onClick={() => setMobileDetailOpen(false)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-card text-content-muted shadow-sm transition hover:border-border-input hover:text-content md:hidden"
                    aria-label={t("common.back")}
                  >
                    <FiArrowLeft className="h-[18px] w-[18px]" strokeWidth={2} />
                  </button>
                ) : null}
                <TicketAvatar title={active.name} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-content">
                    {active.name}
                  </p>
                  <p className="truncate text-[12px] text-content-muted">
                    {active.statusLine ||
                      (active.date
                        ? t("ticketHistory.created", { date: active.date })
                        : t("ticketHistory.ticketThread"))}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5 text-content-muted">
                {[{ labelKey: "common.more", Icon: FiMoreHorizontal }].map(
                  ({ labelKey, Icon }) => (
                    <button
                      key={labelKey}
                      type="button"
                      className="rounded-lg p-2 transition hover:bg-surface-muted hover:text-content"
                      aria-label={t(labelKey)}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </button>
                  ),
                )}
              </div>
            </header>

            <div
              className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-surface-card px-4 py-4 sm:px-6 ${scrollPretty}`}
            >
              <div className="mx-auto max-w-[720px] space-y-4">
                {messages.map((msg) => {
                  if (msg.isSeparator) {
                    return (
                      <div key={msg.id} className="flex justify-center py-2">
                        <span
                          className={`rounded-full bg-surface-muted px-4 py-1 text-[11px] font-medium text-content-muted ring-1 ${hairline}`}
                        >
                          {msg.dateLabel}
                        </span>
                      </div>
                    );
                  }

                  const outgoing = msg.outgoing;
                  const align = outgoing ? "items-end" : "items-start";
                  const bubbleBase =
                    "rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm";
                  const bubble = outgoing
                    ? `${bubbleBase} bg-[var(--client-chat-user-bg)] text-[var(--client-chat-user-fg)] ring-1 ring-[var(--client-chat-user-ring)]`
                    : `${bubbleBase} bg-[var(--client-chat-ai-bg)] text-[var(--client-chat-ai-fg)] ring-1 ring-[var(--client-chat-ai-ring)]`;
                  const isCard = msg.type === "property" && msg.property;
                  const isConfirmation = msg.type === "confirmation";
                  const showConfirmActions = isConfirmation;

                  return (
                    <div key={msg.id} className={`flex flex-col ${align}`}>
                      <div
                        className={`mb-1 flex max-w-[min(100%,520px)] flex-col ${align}`}
                      >
                        <span className="mb-1 px-1 text-[11px] text-content-muted">
                          {localizeSender(t, msg.sender)} · {msg.time}
                        </span>
                        <div
                          className={
                            isCard
                              ? "rounded-2xl bg-transparent p-0 shadow-none ring-0"
                              : bubble
                          }
                        >
                          {msg.type === "text" && msg.body ? (
                            outgoing ? (
                              <p className="whitespace-pre-wrap">{msg.body}</p>
                            ) : (
                              <MarkdownMessage>{msg.body}</MarkdownMessage>
                            )
                          ) : null}

                          {isConfirmation ? (
                            <>
                              {msg.body ? (
                                outgoing ? (
                                  <p className="whitespace-pre-wrap">{msg.body}</p>
                                ) : (
                                  <MarkdownMessage>{msg.body}</MarkdownMessage>
                                )
                              ) : null}
                              <div className="mt-3 rounded-xl border border-border-subtle bg-surface-muted p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-content-muted">
                                  {t("common.summary")}
                                </p>
                                <p className="mt-1.5 text-[13px] leading-relaxed text-content">
                                  {msg.summary}
                                </p>
                              </div>
                              <p className="mt-3 text-[13px] text-content">
                                {t("ticketHistory.confirmQuestion")}
                              </p>
                              {showConfirmActions ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    className="client-btn-option-muted"
                                    onClick={() =>
                                      setConfirmationChoice((c) => ({
                                        ...c,
                                        [active.id]: "no",
                                      }))
                                    }
                                  >
                                    {t("common.no")}
                                  </button>
                                  <button
                                    type="button"
                                    className="client-btn-option"
                                    onClick={() =>
                                      setConfirmationChoice((c) => ({
                                        ...c,
                                        [active.id]: "yes",
                                      }))
                                    }
                                  >
                                    {t("common.yes")}
                                  </button>
                                </div>
                              ) : null}
                            </>
                          ) : null}

                          {isCard ? (
                            <PropertyMessageCard property={msg.property} t={t} />
                          ) : null}

                          {msg.file && !isCard && !isConfirmation ? (
                            <a
                              href="#attachment"
                              className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate text-[12px] font-medium text-teal-700 hover:underline"
                              onClick={(e) => e.preventDefault()}
                            >
                              <FiPaperclip
                                className="h-3.5 w-3.5 shrink-0"
                                aria-hidden
                              />
                              {String(msg.file).split("/").pop()}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/*    <footer className={`flex shrink-0 justify-center border-t ${hairline} bg-surface-card px-4 py-3 sm:px-6`}>
              <div className="flex w-full max-w-[720px] items-center gap-1.5 rounded-2xl border border-border-subtle bg-surface-card px-1.5 py-1.5 shadow-sm sm:gap-2 sm:px-2">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-content-muted transition hover:bg-surface-muted hover:text-content"
                  aria-label="Add attachment"
                >
                  <FiPlus className="h-5 w-5" strokeWidth={2} />
                </button>
                <label className="sr-only" htmlFor="ticket-history-reply">
                  Write your message
                </label>
                <textarea
                  id="ticket-history-reply"
                  rows={1}
                  value={replyText}
                  onChange={(e) =>
                    setReplyByThread((prev) => ({ ...prev, [active.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  placeholder="Write your message..."
                  className="max-h-32 min-h-[44px] min-w-0 flex-1 resize-none rounded-xl border-0 bg-transparent px-2 py-3 text-[13px] leading-5 text-content placeholder:text-content-muted focus:outline-none focus:ring-0"
                />
                <div className="hidden shrink-0 items-center sm:flex">
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-content-muted transition hover:bg-surface-muted"
                    aria-label="Upload"
                  >
                    <FiPaperclip className="h-5 w-5" strokeWidth={2} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSendReply}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm transition hover:bg-teal-700"
                  aria-label="Send message"
                >
                  <FiSend className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
            </footer>
          </>
          */}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-[14px] text-content-muted">
            {t("ticketHistory.selectConversation")}
          </div>
        )}
      </section>
    </div>
  );
}
