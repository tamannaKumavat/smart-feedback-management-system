import { useMemo, useState } from "react";
import {
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
import {
  confirmationFollowUp,
  getTicketHistoryMessagesForThread,
} from "../../../data/clientTicketHistoryDummy.jsx";

const hairline = "border-slate-200";
const inputFocus =
  "focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100/80";

const scrollPretty =
  "[scrollbar-width:thin] [scrollbar-color:rgb(203_213_225/0.65)_transparent] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/40 [&::-webkit-scrollbar-thumb]:transition-colors hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/55";

function TicketAvatar({ title, size = "md" }) {
  const wrap = size === "lg" ? "h-11 w-11" : "h-10 w-10";
  const icon = size === "lg" ? "h-[22px] w-[22px]" : "h-[18px] w-[18px]";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-teal-600 ring-1 ring-slate-200/90 ${wrap}`}
      title={title}
      aria-hidden={title ? undefined : true}
    >
      <IoTicketOutline className={icon} strokeWidth={2} aria-hidden />
    </div>
  );
}

function PropertyMessageCard({ property }) {
  const img =
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=480&q=80&auto=format&fit=crop";
  return (
    <div className="mt-2 max-w-[min(100%,320px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <img
          src={img}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="space-y-2 p-3">
        <div>
          <p className="text-[13px] font-bold text-slate-900">
            {property.title}
          </p>
          <p className="text-[11px] text-slate-500">{property.location}</p>
          <p className="mt-1 text-[15px] font-bold text-slate-900">
            {property.price}
          </p>
        </div>
        <div className="flex gap-3 text-[11px] text-slate-600">
          <span>{property.beds} bed</span>
          <span>{property.baths} bath</span>
          <span>{property.areaSqft} ft²</span>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 text-[10px]">
          <div>
            <p className="text-slate-400">Token price</p>
            <p className="font-semibold text-slate-800">
              {property.tokenPrice}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Projected IRR</p>
            <p className="font-semibold text-slate-800">{property.irr}</p>
          </div>
          <div>
            <p className="text-slate-400">Projected APR</p>
            <p className="font-semibold text-slate-800">{property.apr}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TicketHistory({
  threads = [],
  messagesByThread = {},
  sortOptions = [],
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(sortOptions[0]?.value ?? "newest");
  const [activeId, setActiveId] = useState(threads[0]?.id ?? "");
  const [confirmationChoice, setConfirmationChoice] = useState({});
  const [replyByThread, setReplyByThread] = useState({});
  const [sentFromComposer, setSentFromComposer] = useState({});

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = threads.filter((t) => {
      if (!q) return true;
      const convo = Array.isArray(t.conversation)
        ? t.conversation
            .map((c) => {
              const bits = [`${c.content ?? ""}`, `${c.file ?? ""}`];
              if (c.confirmationRequest?.summary)
                bits.push(c.confirmationRequest.summary);
              return bits.join(" ");
            })
            .join(" ")
        : "";
      const hay =
        `${t.ticketRef ?? ""} ${t.name ?? ""} ${t.subject ?? ""} ${t.category ?? ""} ${t.preview ?? ""} ${t.snippet ?? ""} ${convo}`.toLowerCase();
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
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden bg-white md:flex-row">
      <aside
        className={`flex max-h-[min(42vh,320px)] min-h-0 w-full min-w-0 shrink-0 flex-col bg-white md:max-h-none md:w-[min(100%,380px)] md:border-r ${hairline} lg:w-[360px] lg:max-w-[360px]`}
      >
        <div
          className={`flex shrink-0 items-center justify-between gap-2 border-b ${hairline} px-4 py-3`}
        >
          <h2 className="text-[15px] font-semibold text-slate-900">
            Ticket History
          </h2>
          <button
            type="button"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${hairline} bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-800`}
            aria-label="Compose"
          >
            <FiEdit3 className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>

        <div className={`shrink-0 space-y-2 border-b ${hairline} px-3 py-3`}>
          <div className="relative">
            <FiSearch
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className={`w-full rounded-full border ${hairline} bg-white py-2.5 pl-10 pr-3 text-[13px] text-slate-900 placeholder:text-slate-400 ${inputFocus}`}
              aria-label="Search messages"
            />
          </div>
        </div>

        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${scrollPretty}`}
        >
          {filteredThreads.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-slate-500">
              No threads match your search.
            </p>
          ) : (
            <ul className={`divide-y ${hairline}`}>
              {filteredThreads.map((t) => {
                const selected = t.id === active?.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(t.id)}
                      className={`flex w-full gap-3 px-3 py-3 text-left transition ${
                        selected
                          ? "bg-slate-50 shadow-[inset_3px_0_0_0_#0d9488]"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <TicketAvatar title={t.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-[13px] font-semibold text-slate-900">
                            {t.name}
                          </p>
                          <span className="shrink-0 text-[11px] text-slate-400">
                            {t.timeAgo}
                          </span>
                        </div>
                        <p className="truncate text-[12px] font-medium text-slate-600">
                          {t.subject}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">
                          {t.snippet}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2 text-slate-400">
                          {t.hasAttachment ? (
                            <FiPaperclip
                              className="h-3.5 w-3.5"
                              aria-label="Has attachment"
                            />
                          ) : null}
                          <FiStar
                            className={`h-3.5 w-3.5 ${t.starred ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                            aria-label={t.starred ? "Starred" : "Not starred"}
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

      <section className="flex min-w-0 flex-1 flex-col bg-white">
        {active ? (
          <>
            <header
              className={`flex shrink-0 items-center justify-between gap-3 border-b ${hairline} px-4 py-3 sm:px-5`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <TicketAvatar title={active.name} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-slate-900">
                    {active.name}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5 text-slate-500">
                {[{ label: "More", Icon: FiMoreHorizontal }].map(
                  ({ label, Icon }) => (
                    <button
                      key={label}
                      type="button"
                      className="rounded-lg p-2 transition hover:bg-slate-100 hover:text-slate-900"
                      aria-label={label}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </button>
                  ),
                )}
              </div>
            </header>

            <div
              className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white px-4 py-4 sm:px-6 ${scrollPretty}`}
            >
              <div className="mx-auto max-w-[720px] space-y-2">
                {messages.map((msg) => {
                  if (msg.isSeparator) {
                    return (
                      <div key={msg.id} className="flex justify-center py-2">
                        <span
                          className={`rounded-full bg-slate-50 px-4 py-1 text-[11px] font-medium text-slate-500 ring-1 ${hairline}`}
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
                    ? `${bubbleBase} bg-[#E3F2FD] text-slate-900 ring-1 ring-sky-200/70`
                    : `${bubbleBase} bg-white text-slate-900 ring-1 ring-slate-200/90`;
                  const isCard = msg.type === "property" && msg.property;
                  const isConfirmation = msg.type === "confirmation";
                  const showConfirmActions = isConfirmation;

                  return (
                    <div key={msg.id} className={`flex flex-col ${align}`}>
                      <div
                        className={`mb-1 flex max-w-[min(100%,520px)] flex-col ${align}`}
                      >
                        <span className="mb-1 px-1 text-[11px] text-slate-400">
                          {msg.sender} · {msg.time}
                        </span>
                        <div
                          className={
                            isCard
                              ? "rounded-2xl bg-transparent p-0 shadow-none ring-0"
                              : bubble
                          }
                        >
                          {msg.type === "text" && msg.body ? (
                            <p>{msg.body}</p>
                          ) : null}

                          {isConfirmation ? (
                            <>
                              {msg.body ? <p>{msg.body}</p> : null}
                              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                  Summary
                                </p>
                                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-800">
                                  {msg.summary}
                                </p>
                              </div>
                              <p className="mt-3 text-[13px] text-slate-700">
                                Do you confirm this is correct?
                              </p>
                              {showConfirmActions ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                                    onClick={() =>
                                      setConfirmationChoice((c) => ({
                                        ...c,
                                        [active.id]: "no",
                                      }))
                                    }
                                  >
                                    No
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-full bg-teal-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-teal-700"
                                    onClick={() =>
                                      setConfirmationChoice((c) => ({
                                        ...c,
                                        [active.id]: "yes",
                                      }))
                                    }
                                  >
                                    Yes
                                  </button>
                                </div>
                              ) : null}
                            </>
                          ) : null}

                          {isCard ? (
                            <PropertyMessageCard property={msg.property} />
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

            {/*    <footer className={`flex shrink-0 justify-center border-t ${hairline} bg-white px-4 py-3 sm:px-6`}>
              <div className="flex w-full max-w-[720px] items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-1.5 py-1.5 shadow-sm sm:gap-2 sm:px-2">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
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
                  className="max-h-32 min-h-[44px] min-w-0 flex-1 resize-none rounded-xl border-0 bg-transparent px-2 py-3 text-[13px] leading-5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                />
                <div className="hidden shrink-0 items-center sm:flex">
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50"
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
          <div className="flex flex-1 items-center justify-center p-8 text-[14px] text-slate-500">
            Select a conversation
          </div>
        )}
      </section>
    </div>
  );
}
