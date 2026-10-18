export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="1"
        y="1"
        width="22"
        height="22"
        rx="6"
        stroke="currentColor"
        strokeOpacity="0.25"
      />
      <circle
        cx="12"
        cy="12"
        r="5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.3"
      />
      <circle cx="12" cy="6.5" r="1.9" fill="currentColor" />
      <circle cx="16.8" cy="15.2" r="1.5" fill="currentColor" fillOpacity="0.55" />
      <circle cx="7.2" cy="15.6" r="1.2" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-[26px] w-[26px] text-ink" />
      <span className="text-[21px] font-semibold tracking-tight text-ink">
        Mnemo
      </span>
    </span>
  );
}
