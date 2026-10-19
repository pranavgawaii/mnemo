"use client";

import { motion, useScroll, useSpring } from "motion/react";

/** Thin reading-progress bar pinned just under the fixed site nav. */
export function DocsProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 380,
    damping: 40,
    mass: 0.4,
  });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-16 z-40 h-[2px] origin-left bg-accent"
    />
  );
}
