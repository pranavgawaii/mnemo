/** Positioned feedback reserves no layout space and remains a mounted live region. */
export function CopyFeedback({ message }: { message: string }) {
  return (
    <span
      role="status"
      aria-atomic="true"
      className={`pointer-events-none absolute right-0 top-full z-20 mt-1 w-max max-w-[210px] rounded-md border border-line bg-white px-2.5 py-2 text-left text-[12px] leading-5 text-ink shadow-soft ${message ? "opacity-100" : "opacity-0"}`}
    >
      {message}
    </span>
  );
}
