import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiClock, FiPlus, FiTrash2 } from "react-icons/fi";
import PortalLayout from "../../layouts/PortalLayout.jsx";
import { deleteAllDrafts, listDrafts } from "../../lib/chatApi.js";
import { showError, showSuccess } from "../../lib/toast.js";

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function ClientDrafts() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await listDrafts();
        if (!cancelled) setDrafts(data.drafts || []);
      } catch (err) {
        if (!cancelled) showError(err, "Could not load drafts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function resume(chatId) {
    navigate(`/client/create-ticket?chatId=${chatId}`);
  }

  async function handleDeleteAll() {
    if (deleting || drafts.length === 0) return;
    if (
      !window.confirm(
        `Delete all ${drafts.length} draft${drafts.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const data = await deleteAllDrafts();
      setDrafts([]);
      showSuccess(
        data.deleted > 0
          ? `Deleted ${data.deleted} draft${data.deleted === 1 ? "" : "s"}`
          : "No drafts to delete",
      );
    } catch (err) {
      showError(err, "Could not delete drafts");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <PortalLayout mode="client">
      <section className="mx-auto flex h-full min-h-0 w-full max-w-[920px] flex-col overflow-hidden">
        <header className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="client-page-title">Draft tickets</h1>
            <p className="client-page-subtitle">
              Conversations you started but didn’t finalize. Resume any to pick
              up where you left off.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {/* {drafts.length > 0 ? (
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-[13px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiTrash2 className="text-[14px]" aria-hidden />
                {deleting ? "Deleting…" : "Delete all"}
              </button>
            ) : null} */}
            <button
              type="button"
              onClick={() => navigate("/client/create-ticket")}
              className="client-btn-primary"
            >
              <FiPlus className="text-[14px]" />
              New chat
            </button>
          </div>
        </header>

        <div className="client-card flex min-h-0 flex-1 flex-col overflow-hidden">
          {loading ? (
            <div className="flex flex-1 items-center justify-center py-16 text-[13px] text-content-muted">
              Loading drafts…
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
              <div className="client-empty-icon h-12 w-12">
                <FiClock className="text-[20px]" />
              </div>
              <p className="text-[14px] font-semibold text-content">
                No drafts yet
              </p>
              <p className="max-w-[320px] text-[12px] text-content-muted">
                When you leave a chat before confirming the ticket, it’ll show
                up here so you can finish it later.
              </p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ul className="client-divide divide-y">
                {drafts.map((d) => (
                  <li
                    key={d.id}
                    className="client-row-hover flex items-center justify-between gap-4 px-4 py-3 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-content">
                        Draft chat
                        <span className="ml-2 text-[11px] font-normal uppercase tracking-wide text-content-muted">
                          {d.id.slice(0, 8)}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[12px] text-content-muted">
                        Last activity {formatDateTime(d.updatedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => resume(d.id)}
                      className="client-btn-secondary shrink-0 !py-1.5 !text-[12px]"
                    >
                      Resume
                      <FiArrowRight className="text-[13px]" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </PortalLayout>
  );
}
