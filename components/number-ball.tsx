"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import { useReveal } from "./ui/motion";

/** A drawn number. `matched` lights it up when the viewer holds that number. */
export function NumberBall({
  n,
  index = 0,
  matched,
  size = "md",
}: {
  n: number;
  index?: number;
  matched?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const { ref, state } = useReveal<HTMLSpanElement>();
  return (
    <motion.span
      ref={ref}
      initial={false}
      animate={state === "hidden" ? { scale: 0, rotate: -90, opacity: 0 } : { scale: 1, rotate: 0, opacity: 1 }}
      transition={state === "hidden" ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 18, delay: index * 0.12 }}
      className={clsx(
        "relative inline-flex select-none items-center justify-center rounded-full font-display font-semibold tabular-nums",
        "shadow-[inset_0_-6px_12px_rgba(0,0,0,0.35),inset_0_4px_8px_rgba(255,255,255,0.25)]",
        size === "sm" && "h-9 w-9 text-sm",
        size === "md" && "h-12 w-12 text-lg",
        size === "lg" && "h-16 w-16 text-2xl sm:h-20 sm:w-20 sm:text-3xl",
        matched === undefined && "bg-gradient-to-br from-gold-soft to-ember text-ink",
        matched === true && "bg-gradient-to-br from-mint-soft to-mint text-ink ring-4 ring-mint/25",
        matched === false && "bg-ink-600 text-cream-muted",
      )}
    >
      {n}
    </motion.span>
  );
}
