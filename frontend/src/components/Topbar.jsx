import { FiBell, FiSearch, FiSettings, FiShare2 } from "react-icons/fi";
import { Link } from "react-router-dom";
import WebLogo from "./WebLogo.jsx";

function IconButton({ children, hasDot = false }) {
  return (
    <button
      type="button"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-card text-content-muted hover:bg-surface-page hover:text-content"
    >
      {children}
      {hasDot ? (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-red" />
      ) : null}
    </button>
  );
}

export default function Topbar({ mode }) {
  return (
    <header className="sticky top-0 z-20 bg-surface-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-3">
          <WebLogo className="h-8 w-auto sm:h-10" />
          <span className="hidden text-lg font-semibold text-content sm:inline">
            {mode === "admin" ? "Admin Portal" : "Client Portal"}
          </span>
        </Link>

        <div className="hidden max-w-[480px] flex-1 lg:flex">
          <div className="flex h-11 w-full items-center gap-3 rounded-2xl bg-white px-4">
            <FiSearch className="text-content-muted" />
            <input
              type="text"
              placeholder="Search anything..."
              className="w-full bg-transparent text-captionlarge text-content placeholder:text-content-muted focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <IconButton>
            <FiSettings size={16} />
          </IconButton>
          <IconButton hasDot>
            <FiBell size={16} />
          </IconButton>
          <IconButton>
            <FiShare2 size={16} />
          </IconButton>
          <span className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-gray text-captionsmall font-semibold text-white">
            AD
          </span>
        </div>
      </div>
    </header>
  );
}
