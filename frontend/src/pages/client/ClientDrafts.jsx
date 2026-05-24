import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiClock, FiPlus, FiArrowRight } from "react-icons/fi";
import { useTranslation } from "@/i18n/useTranslation.js";
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  function draftTitle(draft) {
    const text = String(draft.firstMessage ?? "").trim();
    if (!text) return t("drafts.fallbackTitle");
    return text.split("\n")[0].slice(0, 120);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await listDrafts();
        if (!cancelled) setDrafts(data.drafts || []);
      } catch (err) {
        if (!cancelled) showError(err, t("drafts.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  function resume(chatId) {
    navigate(`/client/create-ticket?chatId=${chatId}`);
  }

  return (
    <PortalLayout mode="client">
      <section className="mx-auto w-full max-w-[920px]">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="client-page-title">{t("drafts.title")}</h1>
            <p className="client-page-subtitle">{t("drafts.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/client/create-ticket")}
            className="client-btn-primary"
          >
            <FiPlus className="text-[14px]" />
            {t("drafts.newChat")}
          </button>
        </header>

        <div className="client-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[13px] text-content-muted">
              {t("drafts.loading")}
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <div className="client-empty-icon h-12 w-12">
                <FiClock className="text-[20px]" />
              </div>
              <p className="text-[14px] font-semibold text-content">
                {t("drafts.emptyTitle")}
              </p>
              <p className="max-w-[320px] text-[12px] text-content-muted">
                {t("drafts.emptyBody")}
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
                      {draftTitle(d)}
                    </p>
                    <p className="mt-0.5 text-[12px] text-content-muted">
                      {t("drafts.lastActivity", {
                        date: formatDateTime(d.updatedAt),
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => resume(d.id)}
                    className="client-btn-secondary shrink-0 !py-1.5 !text-[12px]"
                  >
                    {t("drafts.resume")}
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
