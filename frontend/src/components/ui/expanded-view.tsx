"use client";

import { useEffect, useId, useRef, type PointerEvent, type ReactNode } from "react";
import { X } from "lucide-react";

/** Native modal: one reading surface, with browser focus containment and Escape. */
export function ExpandedView({
  open,
  onClose,
  title,
  description,
  toolbar,
  children,
  contentKey,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  toolbar?: ReactNode;
  children: ReactNode;
  contentKey?: string | number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pressedOutside = useRef(false);
  const id = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    element.setAttribute("closedby", "any");
    element.showModal();
    return () => element.close();
  }, [open]);
  function outside(event: PointerEvent<HTMLDialogElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom;
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      onClose={onClose}
      onPointerDown={(event) => {
        if (!("closedBy" in HTMLDialogElement.prototype)) pressedOutside.current = outside(event);
      }}
      onPointerUp={(event) => {
        if (!("closedBy" in HTMLDialogElement.prototype) && pressedOutside.current && outside(event)) event.currentTarget.close();
        pressedOutside.current = false;
      }}
      onPointerCancel={() => { pressedOutside.current = false; }}
      data-lenis-prevent
      className="mnemo-dialog fixed inset-0 m-auto w-[calc(100%-1.5rem)] max-w-6xl overflow-hidden rounded-2xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-ink/35 backdrop:backdrop-blur-sm sm:w-[calc(100%-3rem)]"
    >
      {open && (
        <div className="flex h-full max-h-[calc(100dvh-2rem)] flex-col">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line bg-background px-5 py-4 sm:px-7">
            <div>
              <h2 id={`${id}-title`} className="text-[18px] font-medium">
                {title}
              </h2>
              {description && (
                <p
                  id={`${id}-description`}
                  className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted"
                >
                  {description}
                </p>
              )}
            </div>
            <button
              autoFocus
              type="button"
              aria-label={`Close ${title}`}
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-muted transition-colors hover:text-ink"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </header>
          {toolbar && (
            <div className="shrink-0 border-b border-line px-5 py-3 sm:px-7">
              {toolbar}
            </div>
          )}
          <div
            key={contentKey}
            className="expanded-view-body min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-7"
          >
            {children}
          </div>
        </div>
      )}
    </dialog>
  );
}
