import { NavLink } from "react-router-dom";
import {
  FiActivity,
  FiClock,
  FiEdit3,
  FiLogOut,
  FiPieChart,
  FiUsers,
} from "react-icons/fi";

function itemClassName({ isActive }) {
  return `group flex items-center gap-3 rounded-[2px] px-3 py-2.5 text-captionlarge font-medium transition ${
    isActive
      ? "bg-brand-red/10 text-brand-red border-l-2 border-brand-red"
      : "text-content-muted hover:bg-surface-page hover:text-content"
  }`;
}

function SidebarSection({ title, items }) {
  return (
    <div className="mt-6 ">
      <p className="mb-2 px-3 text-extrasmall font-medium uppercase tracking-wide text-content-muted/70">
        {title}
      </p>
      <nav className="space-y-1">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} className={itemClassName}>
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border-input text-[11px]">
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
      to: "/client/ticket-history",
      label: "Ticket history",
      icon: <FiClock size={16} />,
    },
  ];

  const primaryItems = mode === "admin" ? adminItems : clientItems;

  return (
    <aside className="sticky top-16 h-[calc(100vh-4rem)] min-w-0 bg-white">
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto">
          <SidebarSection title="Menu" items={primaryItems} />
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mb-[12px] mt-3 inline-flex items-center gap-2 rounded-[2px] bg-surface-card px-3 py-2 text-left text-captionlarge font-medium text-content-muted hover:bg-surface-page hover:text-content"
        >
          <FiLogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
