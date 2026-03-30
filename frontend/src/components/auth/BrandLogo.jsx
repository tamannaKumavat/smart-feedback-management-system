export default function BrandLogo({ className = '' }) {
  return (
    <div
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-teal ${className}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2L4 6.5L12 11L20 6.5L12 2Z"
          fill="white"
          fillOpacity="0.95"
        />
        <path
          d="M12 7.5L4 12L12 16.5L20 12L12 7.5Z"
          fill="white"
          fillOpacity="0.95"
        />
        <path
          d="M12 13L4 17.5L12 22L20 17.5L12 13Z"
          fill="white"
          fillOpacity="0.95"
        />
      </svg>
    </div>
  )
}
