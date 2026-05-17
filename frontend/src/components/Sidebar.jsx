import { NavLink } from "react-router-dom";
import {
  FiActivity,
  FiEdit3,
  FiFileText,
  FiLogOut,
  FiPieChart,
  FiUsers,
} from "react-icons/fi";

function itemClassName({ isActive }, mode) {
  if (mode === "client") {
    return `client-nav-link group flex items-center gap-3 px-3 py-2.5 text-captionlarge font-medium focus:outline-none focus-visible:outline-none ${
      isActive
        ? "client-nav-link--active text-brand-red"
        : "text-content-muted hover:text-content"
    }`;
  }
  return `group flex items-center gap-3 rounded-[2px] px-3 py-2.5 text-captionlarge font-medium transition focus:outline-none focus-visible:outline-none ${
    isActive
      ? "bg-brand-red/10 text-brand-red border-l-2 border-brand-red"
      : "text-content-muted hover:bg-surface-page hover:text-content"
  }`;
}

function SidebarSection({ title, items, mode }) {
  return (
    <div className={mode === "client" ? "mt-3" : "mt-6"}>
      <p className="mb-2 px-3 text-extrasmall font-medium uppercase tracking-wide text-content-muted/70">
        {title}
      </p>
      <nav className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={(state) => itemClassName(state, mode)}
          >
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                mode === "client"
                  ? "client-nav-icon border border-border-input"
                  : "border border-border-input"
              }`}
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function Sidebar({ mode, onLogout }) {
  const adminItems = [
    {
      to: "/admin/dashboard",
      label: "Overview",
      icon: <FiPieChart size={16} />,
    },
    { to: "/admin/customers", label: "Customers", icon: <FiUsers size={16} /> },
    {
      to: "/admin/activity-log",
      label: "Activity Log",
      icon: <FiActivity size={16} />,
    },
  ];
  const clientItems = [
    {
      to: "/client/dashboard",
      label: "Overview",
      icon: <FiPieChart size={16} />,
    },
    {
      to: "/client/create-ticket",
      label: "Create a Ticket",
      icon: <FiEdit3 size={16} />,
    },
    {
      to: "/client/drafts",
      label: "Drafts",
      icon: <FiFileText size={16} />,
    },
  ];

  const primaryItems = mode === "admin" ? adminItems : clientItems;

  const asideClass =
    mode === "client"
      ? "client-sidebar flex h-full min-h-0 min-w-0 flex-col px-2 py-2"
      : "sticky top-16 h-[calc(100vh-4rem)] min-w-0 bg-white";

  return (
    <aside className={asideClass}>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1">
          <SidebarSection title="Menu" items={primaryItems} mode={mode} />
        </div>

        <button
          type="button"
          onClick={onLogout}
          className={`mt-2 inline-flex shrink-0 items-center gap-2 px-3 py-2 text-left text-captionlarge font-medium text-content-muted hover:bg-surface-page hover:text-content ${
            mode === "client"
              ? "client-logout mx-1 mb-1 w-[calc(100%-0.5rem)] bg-surface-card/80"
              : "mb-[12px] rounded-[2px] bg-surface-card"
          }`}
        >
          <FiLogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
