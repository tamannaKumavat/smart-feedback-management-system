import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiCalendar,
  FiCheck,
  FiCircle,
  FiEdit3,
  FiFileText,
  FiLayers,
  FiMessageCircle,
  FiMessageSquare,
  FiX,
  FiZap,
} from "react-icons/fi";
import MarkdownMessage from "../../MarkdownMessage.jsx";
import { scaleIn } from "../../../lib/motion.js";
import { getMessages } from "../../../lib/chatApi.js";
import { showError } from "../../../lib/toast.js";

const TEAM_AVATAR = "/ruag-single.png";
const USER_AVATAR = "/user.png";

const TABS = [
  { id: "general", label: "General", Icon: FiFileText },
  { id: "teamResponse", label: "Team response", Icon: FiMessageSquare },
  { id: "progress", label: "Progress", Icon: FiLayers },
  { id: "chatHistory", label: "Chat history", Icon: FiMessageCircle },
];

const PHASE_DEFS = [
  { key: "created", label: "Created", Icon: FiEdit3 },
  { key: "classified", label: "Classified", Icon: FiLayers },
  { key: "inProgress", label: "In Progress", Icon: FiZap },
  { key: "resolved", label: "Resolved", Icon: FiCheck },
];

const PHASE_BADGE = {
  created: "client-phase-badge--created",
  classified: "client-phase-badge--classified",
  inProgress: "client-phase-badge--inProgress",
  resolved: "client-phase-badge--resolved",
};

const PHASE_LABEL = {
  created: "Created",
  classified: "Classified",
  inProgress: "In Progress",
  resolved: "Resolved",
};

const scrollPretty =
  "[scrollbar-width:thin] [scrollbar-color:rgb(100_116_139/0.45)_transparent] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-input/60 hover:[&::-webkit-scrollbar-thumb]:bg-content-muted/50";

const TAB_IDS = TABS.map((t) => t.id);

const springTab = { type: "spring", stiffness: 420, damping: 32 };

function tabDirection(fromId, toId) {
  const from = TAB_IDS.indexOf(fromId);
  const to = TAB_IDS.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return 0;
  return to > from ? 1 : -1;
}

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

function formatResponseTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function teamResponseFromRow(row) {
  const text = String(row?.response ?? "").trim();
  if (text) {
    const comments = Array.isArray(row?.responseComments)
      ? row.responseComments
      : [];
    const latest = comments.length ? comments[comments.length - 1] : null;
    return {
      text,
      at: latest?.created ?? latest?.updated ?? null,
    };
  }
  const comments = Array.isArray(row?.responseComments)
    ? row.responseComments
    : [];
  const withBody = comments.filter((c) => String(c?.body ?? "").trim());
  if (!withBody.length) return null;
  const latest = withBody[withBody.length - 1];
  return {
    text: String(latest.body).trim(),
    at: latest.created ?? latest.updated ?? null,
  };
}

function phaseIndex(phase) {
  const i = PHASE_DEFS.findIndex((p) => p.key === phase);
  return i >= 0 ? i : 0;
}

function VerticalStepIcon({ step, i, activeIndex }) {
  const completed = i < activeIndex;
  const current = i === activeIndex;
  const PhaseIcon = step.Icon;

  if (completed) {
    return (
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...springTab, delay: i * 0.06 }}
        className="client-timeline-step--done relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 shadow-md"
        aria-hidden
      >
        <FiCheck className="text-[16px]" strokeWidth={2.5} />
      </motion.div>
    );
  }

  if (current) {
    return (
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...springTab, delay: i * 0.06 }}
        className="relative"
        aria-current="step"
      >
        <motion.span
          className="absolute inset-0 rounded-full bg-[var(--client-accent)]/25"
          animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0, 0.55] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        />
        <div className="client-timeline-step--current-ring relative rounded-full border-2 border-dashed p-[3px] shadow-sm">
          <div className="client-timeline-step--current flex h-10 w-10 items-center justify-center rounded-full shadow-inner">
            <PhaseIcon className="text-[15px] text-white" strokeWidth={2.25} aria-hidden />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ ...springTab, delay: i * 0.06 }}
      className="client-timeline-step--pending flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2"
      aria-hidden
    >
      <PhaseIcon className="text-[14px]" strokeWidth={2} />
    </motion.div>
  );
}

function VerticalTimeline({ phase, timeline = {} }) {
  const activeIndex = phaseIndex(phase ?? "created");

  return (
    <div className="client-ticket-timeline overflow-hidden rounded-2xl border border-border-subtle bg-gradient-to-b from-surface-muted/50 to-surface-card px-5 py-6 sm:px-6">
      <div className="relative">
        {PHASE_DEFS.map((step, i) => {
          const entry = timeline[step.key];
          const completed = i < activeIndex;
          const current = i === activeIndex;
          const isLast = i === PHASE_DEFS.length - 1;
          const lineActive = i < activeIndex;

          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: 0.05 + i * 0.09,
                duration: 0.4,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className={`relative flex gap-4 ${isLast ? "" : "pb-8"}`}
            >
              {!isLast ? (
                <div
                  className="absolute left-5 top-11 bottom-0 w-[3px] -translate-x-1/2 overflow-hidden rounded-full"
                  aria-hidden
                >
                  <div className="client-timeline-track h-full w-full" />
                  {lineActive ? (
                    <motion.div
                      className="client-timeline-track--active absolute inset-x-0 top-0 w-full rounded-full"
                      initial={{ height: "0%" }}
                      animate={{ height: "100%" }}
                      transition={{
                        delay: 0.15 + i * 0.12,
                        duration: 0.45,
                        ease: [0.25, 0.1, 0.25, 1],
                      }}
                    />
                  ) : null}
                </div>
              ) : null}

              <div className="relative z-[1] shrink-0 pt-0.5">
                <VerticalStepIcon step={step} i={i} activeIndex={activeIndex} />
              </div>

              <motion.div
                layout
                className={`min-w-0 flex-1 rounded-xl border px-4 py-3.5 transition-shadow sm:px-5 sm:py-4 ${
                  current
                    ? "border-[var(--client-accent)]/35 bg-[var(--client-accent)]/[0.07] shadow-md ring-1 ring-[var(--client-accent)]/20"
                    : completed
                      ? "border-border-subtle bg-surface-card shadow-sm"
                      : "border-border-subtle/70 bg-surface-muted/30 opacity-80"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <step.Icon
                      className={`text-[15px] ${
                        current
                          ? "text-[var(--client-accent)]"
                          : completed
                            ? "text-emerald-600"
                            : "text-content-muted"
                      }`}
                      aria-hidden
                    />
                    <h4 className="client-timeline-title text-[14px] font-bold">
                      {step.label}
                    </h4>
                  </div>
                  {current ? (
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="inline-flex shrink-0 items-center rounded-full bg-[var(--client-accent)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm"
                    >
                      Current
                    </motion.span>
                  ) : completed ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <FiCheck className="text-[12px]" aria-hidden />
                      Done
                    </span>
                  ) : null}
                </div>

                {entry?.at ? (
                  <p className="client-timeline-muted mt-2 text-[12px] font-medium">
                    {entry.at}
                  </p>
                ) : null}

                <p
                  className={`mt-1.5 text-[13px] leading-relaxed ${
                    current ? "text-content" : "text-content-muted"
                  }`}
                >
                  {entry?.detail ?? "—"}
                </p>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex min-h-[min(420px,100%)] flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle bg-surface-muted/30 px-6 py-14 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-card text-content-muted ring-1 ring-border-subtle">
        <Icon className="text-[22px]" aria-hidden />
      </span>
      <p className="text-[14px] font-semibold text-dashboard-heading">{title}</p>
      <p className="mt-1.5 max-w-[280px] text-[13px] leading-relaxed text-content-muted">
        {description}
      </p>
    </div>
  );
}

function ChatMessage({ msg }) {
  const isUser = msg.sender === "user";
  const time = formatTime(msg.createdAt);
  const bubbleUser =
    "client-chat-bubble-user rounded-2xl rounded-br-md px-4 py-2.5 text-[13px] leading-relaxed shadow-sm";
  const bubbleTeam =
    "client-chat-bubble-team rounded-2xl rounded-bl-md px-4 py-2.5 text-[13px] leading-relaxed shadow-sm";

  return (
    <div
      className={`client-chat-row flex w-full ${
        isUser ? "client-chat-row--user" : "client-chat-row--team"
      }`}
    >
      <article
        className={`flex max-w-[min(90%,34rem)] flex-col gap-1.5 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <p
          className={`text-[12px] leading-none ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          <span className="font-semibold text-dashboard-heading">
            {isUser ? "You" : "Ruag Team"}
          </span>
          {time ? <span className="text-content-muted"> · {time}</span> : null}
        </p>
        <div
          className={`flex max-w-full items-end gap-2.5 ${
            isUser ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border-subtle bg-surface-card">
            <img
              src={isUser ? USER_AVATAR : TEAM_AVATAR}
              alt={isUser ? "You" : "Ruag Team"}
              className="h-full w-full object-cover"
            />
          </div>
          <div className={`min-w-0 max-w-full ${isUser ? bubbleUser : bubbleTeam}`}>
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

function TabBar({ activeTab, onChange, badges }) {
  const activeIndex = Math.max(
    0,
    TABS.findIndex((t) => t.id === activeTab),
  );

  return (
    <div
      className="client-separator shrink-0 px-3 py-3 sm:px-5 sm:py-3.5"
      role="tablist"
      aria-label="Issue details"
    >
      <div className="relative rounded-2xl bg-surface-muted/70 p-1.5 ring-1 ring-border-subtle/80">
        <motion.div
          className="pointer-events-none absolute inset-y-1.5 rounded-xl bg-surface-card shadow-[0_4px_14px_-2px_rgba(15,23,42,0.12)] ring-1 ring-border-subtle"
          style={{ width: `calc((100% - 0.5rem) / ${TABS.length})` }}
          animate={{ left: `calc(0.25rem + ((100% - 0.5rem) / ${TABS.length}) * ${activeIndex})` }}
          transition={springTab}
          aria-hidden
        />
        <div className={`relative flex gap-1 overflow-x-auto ${scrollPretty}`}>
          {TABS.map(({ id, label, Icon }) => {
            const selected = activeTab === id;
            const badge = badges[id];
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`issue-tabpanel-${id}`}
                id={`issue-tab-${id}`}
                onClick={() => onChange(id)}
                className={`relative z-[1] flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-2 py-3 text-[11px] font-semibold sm:px-3 sm:text-[12px] ${
                  selected ? "text-[var(--client-accent)]" : "text-content-muted"
                }`}
              >
                <motion.span
                  className="relative z-[1] flex items-center gap-2"
                  animate={{
                    scale: selected ? 1.02 : 1,
                    y: selected ? -1 : 0,
                  }}
                  transition={springTab}
                >
                  <motion.span
                    animate={{
                      rotate: selected ? [0, -8, 8, 0] : 0,
                      scale: selected ? 1.12 : 1,
                    }}
                    transition={
                      selected
                        ? { duration: 0.45, ease: "easeOut" }
                        : springTab
                    }
                  >
                    <Icon className="text-[16px] sm:text-[17px]" aria-hidden />
                  </motion.span>
                  <span className="hidden truncate sm:inline">{label}</span>
                  <span className="truncate sm:hidden">
                    {label.split(" ")[0]}
                  </span>
                  {badge != null && badge > 0 ? (
                    <motion.span
                      layout
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={springTab}
                      className={`inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                        selected
                          ? "bg-[var(--client-accent)] text-white"
                          : "bg-surface-card text-content-muted ring-1 ring-border-subtle"
                      }`}
                    >
                      {badge}
                    </motion.span>
                  ) : null}
                </motion.span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TabPanel({ tabKey, direction, children, ...a11y }) {
  const x = direction === 0 ? 0 : direction > 0 ? 28 : -28;
  return (
    <motion.div
      key={tabKey}
      role="tabpanel"
      initial={{ opacity: 0, x, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -x * 0.6, scale: 0.98 }}
      transition={springTab}
      className="h-full"
      {...a11y}
    >
      {children}
    </motion.div>
  );
}

export default function IssueDetailModal({ open, row, onClose, onExited }) {
  const [activeTab, setActiveTab] = useState("general");
  const [messages, setMessages] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const prevTabRef = useRef("general");
  const slideDirection = tabDirection(prevTabRef.current, activeTab);

  const title = row?.ticket ?? row?.feedback ?? "Issue";
  const description = row?.description ?? title;
  const phase = row?.timelinePhase ?? "created";
  const phaseLabel = PHASE_LABEL[phase] ?? PHASE_LABEL.created;
  const phaseBadge = PHASE_BADGE[phase] ?? PHASE_BADGE.created;
  const teamReply = teamResponseFromRow(row);
  const showShot = Boolean(row?.hasScreenshot);

  const tabBadges = useMemo(
    () => ({
      teamResponse: teamReply ? 1 : 0,
      chatHistory: loadingChat ? 0 : messages.length,
    }),
    [teamReply, loadingChat, messages.length],
  );

  useEffect(() => {
    if (open) {
      setActiveTab("general");
      prevTabRef.current = "general";
    }
  }, [open, row?.id]);

  useEffect(() => {
    prevTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (!open || !row?.id) {
      setMessages([]);
      return undefined;
    }

    let cancelled = false;
    async function load() {
      setLoadingChat(true);
      try {
        const data = await getMessages(row.id);
        if (!cancelled) setMessages(data.messages || []);
      } catch (err) {
        if (!cancelled) showError(err, "Could not load conversation");
      } finally {
        if (!cancelled) setLoadingChat(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open, row?.id]);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return undefined;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [open]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function renderTabPanel() {
    const dir = slideDirection;
    switch (activeTab) {
      case "general":
        return (
          <TabPanel
            tabKey="general"
            direction={dir}
            id="issue-tabpanel-general"
            aria-labelledby="issue-tab-general"
          >
            <div className="h-full space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border-subtle bg-surface-muted/40 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-content-muted">
                  Status
                </p>
                <p className="mt-1 text-[14px] font-semibold text-content">
                  {phaseLabel}
                </p>
              </div>
              <div className="rounded-xl border border-border-subtle bg-surface-muted/40 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-content-muted">
                  Created
                </p>
                <p className="mt-1 text-[14px] font-semibold text-content">
                  {row?.date ?? "—"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--client-accent)]/10 text-[var(--client-accent)]">
                  <FiEdit3 className="text-[16px]" aria-hidden />
                </span>
                <div>
                  <h3 className="text-[14px] font-semibold text-dashboard-heading">
                    Description
                  </h3>
                  <p className="text-[12px] text-content-muted">
                    What you reported
                  </p>
                </div>
              </div>
              {showShot ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <img
                    src="/ticket-dummy.png"
                    alt="Attachment"
                    className="h-24 w-24 shrink-0 rounded-xl border border-border-subtle object-contain shadow-sm"
                    loading="lazy"
                  />
                  <p className="text-[14px] leading-relaxed text-content">
                    {description}
                  </p>
                </div>
              ) : (
                <p className="text-[14px] leading-relaxed text-content">
                  {description}
                </p>
              )}
            </div>
            </div>
          </TabPanel>
        );

      case "teamResponse":
        return (
          <TabPanel
            tabKey="teamResponse"
            direction={dir}
            id="issue-tabpanel-teamResponse"
            aria-labelledby="issue-tab-teamResponse"
          >
            {teamReply ? (
              <div className="rounded-2xl border border-[var(--client-accent)]/20 bg-gradient-to-br from-[var(--client-accent)]/5 to-surface-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3 border-b border-border-subtle/80 pb-4">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-surface-card shadow-sm ring-2 ring-[var(--client-accent)]/20">
                    <img
                      src={TEAM_AVATAR}
                      alt="Ruag Team"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-dashboard-heading">
                      Ruag Team
                    </p>
                    <p className="text-[12px] text-content-muted">
                      Support response
                      {teamReply.at
                        ? ` · ${formatResponseTime(teamReply.at)}`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="client-chat-bubble-team rounded-2xl rounded-bl-md px-5 py-4 text-[14px] leading-relaxed shadow-sm">
                  <p className="whitespace-pre-wrap">{teamReply.text}</p>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={FiMessageSquare}
                title="No team response yet"
                description="When the Ruag support team replies to your issue, their message will appear here."
              />
            )}
          </TabPanel>
        );

      case "progress":
        return (
          <TabPanel
            tabKey="progress"
            direction={dir}
            id="issue-tabpanel-progress"
            aria-labelledby="issue-tab-progress"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, ...springTab }}
              className="mb-5 flex items-end justify-between gap-4"
            >
              <div>
                <h3 className="text-[15px] font-bold text-dashboard-heading">
                  Ticket lifecycle
                </h3>
                <p className="mt-1 text-[13px] text-content-muted">
                  Track how your issue moves from creation to resolution
                </p>
              </div>
              <div className="hidden shrink-0 rounded-xl border border-border-subtle bg-surface-muted/50 px-4 py-2 text-right sm:block">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-content-muted">
                  Current stage
                </p>
                <p className="mt-0.5 text-[14px] font-bold text-[var(--client-accent)]">
                  {phaseLabel}
                </p>
              </div>
            </motion.div>
            <VerticalTimeline phase={phase} timeline={row?.timeline ?? {}} />
          </TabPanel>
        );

      case "chatHistory":
        return (
          <TabPanel
            tabKey="chatHistory"
            direction={dir}
            id="issue-tabpanel-chatHistory"
            aria-labelledby="issue-tab-chatHistory"
          >
            <div
              className="rounded-2xl border border-border-subtle px-4 py-5 sm:px-5"
              style={{ background: "var(--client-chat-area)" }}
            >
              {loadingChat ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <div className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--client-accent)] border-t-transparent" />
                  <p className="text-[13px] text-content-muted">
                    Loading chat history…
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <EmptyState
                  icon={FiMessageCircle}
                  title="No messages yet"
                  description="Your conversation with the assistant will appear here once you start chatting about this issue."
                />
              ) : (
                <div className="space-y-5">
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} msg={msg} />
                  ))}
                </div>
              )}
            </div>
          </TabPanel>
        );

      default:
        return null;
    }
  }

  const isVisible = Boolean(open && row);

  return (
    <AnimatePresence onExitComplete={onExited}>
      {isVisible ? (
        <motion.div
          key="issue-detail-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="issue-detail-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: "none" }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[3px]"
            aria-label="Close issue details"
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 flex h-[min(94dvh,880px)] w-[min(calc(100vw-1.5rem),860px)] shrink-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-card shadow-[0_24px_64px_-12px_rgba(15,23,42,0.35)]"
            initial={scaleIn.initial}
            animate={scaleIn.animate}
            exit={{ opacity: 0, scale: 0.97, pointerEvents: "none" }}
            transition={scaleIn.transition}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="client-separator relative shrink-0 overflow-hidden px-5 py-4 sm:px-6 sm:py-5">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--client-accent)]/80 via-[var(--client-accent)]/40 to-transparent"
                aria-hidden
              />
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold client-phase-badge ${phaseBadge}`}
                    >
                      {phaseLabel}
                    </span>
                    {row.date ? (
                      <span className="inline-flex items-center gap-1 text-[12px] text-content-muted">
                        <FiCalendar className="shrink-0" aria-hidden />
                        {row.date}
                      </span>
                    ) : null}
                  </div>
                  <h2
                    id="issue-detail-title"
                    className="text-[17px] font-bold leading-snug text-dashboard-heading sm:text-[19px]"
                  >
                    {title}
                  </h2>
                  {row.id ? (
                    <p className="mt-1 font-mono text-[11px] text-content-muted">
                      #{String(row.id).slice(0, 8)}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-card text-content-muted shadow-sm transition hover:bg-surface-muted hover:text-content"
                  aria-label="Close"
                >
                  <FiX className="text-[18px]" />
                </button>
              </div>
            </header>

            <TabBar
              activeTab={activeTab}
              onChange={setActiveTab}
              badges={tabBadges}
            />

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div
                className={`h-full min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 ${scrollPretty}`}
              >
                <div className="min-h-full">
                  <AnimatePresence mode="wait">
                    {renderTabPanel()}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
