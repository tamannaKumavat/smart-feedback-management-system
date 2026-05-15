import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiClock, FiPlus, FiArrowRight } from "react-icons/fi";
import PortalLayout from "../../layouts/PortalLayout.jsx";
import { listDrafts } from "../../lib/chatApi.js";
import { showError } from "../../lib/toast.js";

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

  return (
    <PortalLayout mode="client">
      <section className="mx-auto w-full max-w-[920px]">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="client-page-title">Draft tickets</h1>
            <p className="client-page-subtitle">
              Conversations you started but didn’t finalize. Resume any to pick
              up where you left off.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/client/create-ticket")}
            className="client-btn-primary"
          >
            <FiPlus className="text-[14px]" />
            New chat
          </button>
        </header>

        <div className="client-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[13px] text-content-muted">
              Loading drafts…
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
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
          )}
        </div>
      </section>
    </PortalLayout>
  );
}
