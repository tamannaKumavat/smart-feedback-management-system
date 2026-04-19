import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiChevronDown } from "react-icons/fi";

const triggerShadow = "shadow-[0_4px_20px_-4px_rgba(85,80,96,0.12),0_2px_8px_-2px_rgba(168,128,255,0.08)]";

const defaultMenuShadow =
  "shadow-[0_20px_50px_-12px_rgba(85,80,96,0.2),0_12px_32px_-8px_rgba(168,128,255,0.18),0_4px_12px_-2px_rgba(85,80,96,0.08)]";

export default function Dropdown({
  id,
  options = [],
  value,
  onChange,
  placeholder,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  menuShadowClass = defaultMenuShadow,
  selectedOptionClassName = "bg-[#AFC3E6] text-white",
  unselectedOptionClassName = "text-[#555060] hover:bg-[#AFC3E6] hover:text-white",
  chevronClassName = "text-[#AFC3E6]",
  labelClassName,
  disabled = false,
  "aria-label": ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const { displayLabel, isPlaceholder } = useMemo(() => {
    const selected = options.find((o) => o.value === value);
    if (selected) return { displayLabel: selected.label, isPlaceholder: false };
    if (placeholder != null && (value === "" || value == null || value === undefined)) {
      return { displayLabel: placeholder, isPlaceholder: true };
    }
    const fallback = options[0]?.label ?? "—";
    return { displayLabel: fallback, isPlaceholder: false };
  }, [options, value, placeholder]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) close();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  function pick(nextValue) {
    onChange?.(nextValue);
    close();
  }

  const baseBtn = [
    "flex w-full cursor-pointer items-center justify-between gap-3 rounded-[12px] border border-[#ECECF4] bg-white",
    " text-left text-[13px] font-medium transition",
    "text-[#555060] hover:border-[#E0E0EE]",
    "focus-visible:border-[#A880FF]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A880FF]/25",
    "disabled:cursor-not-allowed disabled:opacity-50",
    triggerShadow,
    "sm:rounded-2xl sm:py-3.5 sm:pl-5 sm:text-[14px]",
  ].join(" ");

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={`${baseBtn} ${buttonClassName}`}
      >
        <span
          className={
            labelClassName != null && labelClassName !== ""
              ? `min-w-0 flex-1 truncate ${labelClassName}`
              : `min-w-0 flex-1 truncate ${isPlaceholder ? "font-normal text-[#D1D1E0]" : "text-[#555060]"}`
          }
        >
          {displayLabel}
        </span>
        <FiChevronDown
          className={`h-5 w-5 shrink-0 transition-transform duration-200 ${chevronClassName} ${open ? "rotate-180" : ""}`}
          strokeWidth={2.25}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          role="listbox"
          {...(id ? { "aria-activedescendant": `${id}-opt-${value}` } : {})}
          className={`absolute left-0  right-0 z-50 mt-2 max-h-60 overflow-auto  rounded-[12px] border border-[#ECECF4] bg-white py-2 ${menuShadowClass} ${menuClassName}`}
        >
          {options.map((opt) => {
            const selectedOpt = opt.value === value;
            return (
              <li
                key={opt.value}
                {...(id ? { id: `${id}-opt-${opt.value}` } : {})}
                role="option"
                aria-selected={selectedOpt}
                onClick={() => pick(opt.value)}
                className={`mx-1.5 cursor-pointer rounded-[12px] px-4 py-2 text-[13px] font-medium transition-colors sm:mx-2 sm:text-[14px] ${
                  selectedOpt ? selectedOptionClassName : unselectedOptionClassName
                }`}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
