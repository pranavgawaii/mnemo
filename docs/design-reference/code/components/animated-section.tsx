"use client";

import React, { useEffect, useRef, useState } from "react";

interface AnimatedSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  delay?: number;
}

/**
 * Reveals its children once when scrolled into view.
 *
 * Ported from the Mnemo landing page (which ported it from Specboard). The only
 * change from the original is that `style` is destructured, so passing a custom
 * style cannot accidentally drop the animation delay.
 *
 * Contract:
 *   - 14px fade-up, 0.7s, cubic-bezier(0.16, 1, 0.3, 1)
 *   - fires once at 12% visibility
 *   - no scroll listener, no animation library
 *   - `prefers-reduced-motion` is handled in globals.css
 */
export function AnimatedSection({
  children,
  className = "",
  delay = 0,
  style,
  ...props
}: AnimatedSectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { root: null, rootMargin: "0px", threshold: 0.12 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={isVisible ? "visible" : "pending"}
      className={`${className} ${isVisible ? "animate-fade-up" : "opacity-0"}`}
      style={{ animationDelay: `${delay}ms`, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
