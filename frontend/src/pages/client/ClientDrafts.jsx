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
            <h1 className="text-[20px] font-semibold leading-tight text-[#0f172a]">
              Draft tickets
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Conversations you started but didn’t finalize. Resume any to pick
              up where you left off.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/client/create-ticket")}
            className="inline-flex items-center gap-2 rounded-full bg-[#020c3d] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#0a1a5c]"
          >
            <FiPlus className="text-[14px]" />
            New chat
          </button>
        </header>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[13px] text-slate-500">
              Loading drafts…
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <FiClock className="text-[20px]" />
              </div>
              <p className="text-[14px] font-semibold text-slate-700">
                No drafts yet
              </p>
              <p className="max-w-[320px] text-[12px] text-slate-500">
                When you leave a chat before confirming the ticket, it’ll show
                up here so you can finish it later.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {drafts.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-slate-50 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-slate-800">
                      Draft chat
                      <span className="ml-2 text-[11px] font-normal uppercase tracking-wide text-slate-400">
                        {d.id.slice(0, 8)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      Last activity {formatDateTime(d.updatedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => resume(d.id)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-100"
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
