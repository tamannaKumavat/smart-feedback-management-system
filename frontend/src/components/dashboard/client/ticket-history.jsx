import { useMemo, useState } from "react";
import {
  FiEdit3,
  FiLink,
  FiMoreHorizontal,
  FiPaperclip,
  FiPhone,
  FiPlus,
  FiSearch,
  FiSend,
  FiStar,
  FiVideo,
} from "react-icons/fi";

const CHANNEL_BADGE = {
  whatsapp: { bg: "bg-[#25D366]", label: "W" },
  messenger: { bg: "bg-[#0084FF]", label: "M" },
  email: { bg: "bg-[#64748B]", label: "@" },
};

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({ name, channel, size = "md" }) {
  const ch = CHANNEL_BADGE[channel] ?? CHANNEL_BADGE.email;
  const dim = size === "lg" ? "h-11 w-11 text-sm" : "h-10 w-10 text-[11px]";
  return (
    <div className={`relative shrink-0 ${dim}`}>
      <div
        className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-100 font-semibold text-slate-600 ring-1 ring-slate-200/80"
        aria-hidden
      >
        {initials(name)}
      </div>
      <span
        className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm ${ch.bg}`}
        title={channel}
      >
        {ch.label}
      </span>
    </div>
  );
}

function PropertyMessageCard({ property }) {
  const img =
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=480&q=80&auto=format&fit=crop";
  return (
    <div className="mt-2 max-w-[min(100%,320px)] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="space-y-2 p-3">
        <div>
          <p className="text-[13px] font-bold text-slate-900">{property.title}</p>
          <p className="text-[11px] text-slate-500">{property.location}</p>
          <p className="mt-1 text-[15px] font-bold text-slate-900">{property.price}</p>
        </div>
        <div className="flex gap-3 text-[11px] text-slate-600">
          <span>{property.beds} bed</span>
          <span>{property.baths} bath</span>
          <span>{property.areaSqft} ft²</span>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 text-[10px]">
          <div>
            <p className="text-slate-400">Token price</p>
            <p className="font-semibold text-slate-800">{property.tokenPrice}</p>
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

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = threads.filter((t) => {
      if (!q) return true;
      const hay = `${t.name} ${t.subject} ${t.snippet}`.toLowerCase();
      return hay.includes(q);
    });
    if (sort === "oldest") list = [...list].reverse();
    if (sort === "unread") list = [...list].sort((a, b) => (b.unread ?? 0) - (a.unread ?? 0));
    return list;
  }, [threads, query, sort]);

  const active = threads.find((t) => t.id === activeId) ?? threads[0];
  const messages = active ? messagesByThread[active.id] ?? [] : [];

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-xl border border-[#F3F4F6] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.04)] md:flex-row">
      {/* Left: thread list */}
      <aside className="flex max-h-[min(42vh,320px)] min-h-0 w-full min-w-0 shrink-0 flex-col border-[#F3F4F6] bg-[#FAFBFC] md:max-h-none md:w-[min(100%,380px)] md:border-r lg:w-[360px] lg:max-w-[360px]">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#F3F4F6] px-4 py-3">
          <h2 className="text-[15px] font-bold text-[#0F172A]">Messages</h2>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#64748B] shadow-sm transition hover:border-[#CBD5E1] hover:text-[#111827]"
            aria-label="Compose"
          >
            <FiEdit3 className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>

        <div className="shrink-0 space-y-2 border-b border-[#F3F4F6] px-3 py-3">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full rounded-full border border-[#E5E7EB] bg-white py-2.5 pl-10 pr-3 text-[13px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#5EEAD4]/80 focus:outline-none focus:ring-2 focus:ring-[#99F6E4]/50"
              aria-label="Search messages"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-full cursor-pointer rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] font-medium text-[#374151] focus:border-[#5EEAD4] focus:outline-none focus:ring-2 focus:ring-[#99F6E4]/40"
            aria-label="Sort messages"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {filteredThreads.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-[#64748B]">No threads match your search.</p>
          ) : (
            <ul className="divide-y divide-[#F3F4F6]">
              {filteredThreads.map((t) => {
                const selected = t.id === active?.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(t.id)}
                      className={`flex w-full gap-3 px-3 py-3 text-left transition ${
                        selected ? "bg-white shadow-[inset_3px_0_0_0_#14B8A8]" : "hover:bg-white/80"
                      }`}
                    >
                      <Avatar name={t.name} channel={t.channel} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-[13px] font-bold text-[#111827]">{t.name}</p>
                          <span className="shrink-0 text-[11px] text-[#94A3B8]">{t.timeAgo}</span>
                        </div>
                        <p className="truncate text-[12px] font-medium text-[#475569]">{t.subject}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#64748B]">{t.snippet}</p>
                        <div className="mt-1.5 flex items-center gap-2 text-[#94A3B8]">
                          {t.hasAttachment ? <FiPaperclip className="h-3.5 w-3.5" aria-label="Has attachment" /> : null}
                          <FiStar
                            className={`h-3.5 w-3.5 ${t.starred ? "fill-amber-400 text-amber-400" : "text-[#CBD5E1]"}`}
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

      {/* Right: conversation */}
      <section className="flex min-w-0 flex-1 flex-col bg-white">
        {active ? (
          <>
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#F3F4F6] px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={active.name} channel={active.channel} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold text-[#0F172A]">{active.name}</p>
                  <p className="truncate text-[12px] text-[#94A3B8]">
                    {active.statusLine || "last seen recently"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-[#64748B]">
                <button type="button" className="rounded-lg p-2 hover:bg-[#F8FAFC] hover:text-[#111827]" aria-label="Call">
                  <FiPhone className="h-5 w-5" strokeWidth={2} />
                </button>
                <button type="button" className="rounded-lg p-2 hover:bg-[#F8FAFC] hover:text-[#111827]" aria-label="Link">
                  <FiLink className="h-5 w-5" strokeWidth={2} />
                </button>
                <button type="button" className="rounded-lg p-2 hover:bg-[#F8FAFC] hover:text-[#111827]" aria-label="Search">
                  <FiSearch className="h-5 w-5" strokeWidth={2} />
                </button>
                <button type="button" className="rounded-lg p-2 hover:bg-[#F8FAFC] hover:text-[#111827]" aria-label="More">
                  <FiMoreHorizontal className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#F8FAFC]/90 px-4 py-4 sm:px-6">
              <div className="mx-auto max-w-[720px] space-y-4">
                {messages.map((msg) => {
                  if (msg.isSeparator) {
                    return (
                      <div key={msg.id} className="flex justify-center py-2">
                        <span className="rounded-full bg-white px-4 py-1 text-[11px] font-medium text-[#64748B] shadow-sm ring-1 ring-[#F3F4F6]">
                          {msg.dateLabel}
                        </span>
                      </div>
                    );
                  }
                  const outgoing = msg.outgoing;
                  const align = outgoing ? "items-end" : "items-start";
                  const bubble = outgoing
                    ? "bg-gradient-to-b from-sky-100 to-sky-50 text-slate-900 ring-1 ring-sky-200/80"
                    : "bg-white text-slate-900 ring-1 ring-slate-200/90";
                  const isCard = msg.type === "property" && msg.property;

                  return (
                    <div key={msg.id} className={`flex flex-col ${align}`}>
                      <div className={`mb-1 flex max-w-[min(100%,520px)] flex-col ${align}`}>
                        <span className="mb-1 px-1 text-[11px] text-[#94A3B8]">
                          {msg.sender} · {msg.time}
                        </span>
                        <div
                          className={`rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                            isCard ? "bg-transparent p-0 shadow-none ring-0" : `px-4 py-2.5 ${bubble}`
                          }`}
                        >
                          {msg.type === "text" && msg.body ? <p>{msg.body}</p> : null}
                          {isCard ? <PropertyMessageCard property={msg.property} /> : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <footer className="shrink-0 border-t border-[#F3F4F6] bg-white px-4 py-3 sm:px-5">
              <div className="mx-auto flex max-w-[720px] items-end gap-2 rounded-2xl border border-[#E5E7EB] bg-[#FAFBFC] p-2 shadow-inner">
                <button
                  type="button"
                  className="shrink-0 rounded-xl p-2 text-[#64748B] hover:bg-white hover:text-[#111827]"
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
                  placeholder="Write your message..."
                  className="max-h-32 min-h-[44px] min-w-0 flex-1 resize-none rounded-xl border-0 bg-transparent px-2 py-2 text-[13px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-0"
                />
                <div className="hidden shrink-0 items-center gap-0.5 sm:flex">
                  <span className="rounded-lg px-2 py-1.5 text-[12px] font-semibold text-[#94A3B8]">U</span>
                  <button type="button" className="rounded-lg p-2 text-[#94A3B8] hover:bg-white hover:text-[#111827]" aria-label="Emoji">
                    <span className="text-base leading-none">😊</span>
                  </button>
                  <button type="button" className="rounded-lg p-2 text-[#64748B] hover:bg-white" aria-label="Upload">
                    <FiPaperclip className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <button type="button" className="rounded-lg p-2 text-[#64748B] hover:bg-white" aria-label="Video">
                    <FiVideo className="h-5 w-5" strokeWidth={2} />
                  </button>
                </div>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#14B8A8] text-white shadow-sm transition hover:bg-[#0D9488]"
                  aria-label="Send message"
                >
                  <FiSend className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-[14px] text-[#64748B]">
            Select a conversation
          </div>
        )}
      </section>
    </div>
  );
}
