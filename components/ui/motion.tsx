"use client";

import { animate, motion, useInView, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Progressive-enhancement reveal state. Content is server-rendered VISIBLE;
 * only elements that start below the fold are hidden after hydration and
 * animated in when scrolled to. Without JS (or before hydration) nothing is hidden.
 */
export function useReveal<T extends Element>() {
  const ref = useRef<T>(null);
  const reduce = useReducedMotion();
  const [state, setState] = useState<"static" | "hidden" | "shown">("static");

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || reduce || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already on screen: leave as is
    setState("hidden");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -60px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  return { ref, state };
}

/** Fades and lifts content into view once, as it scrolls into the viewport. */
export function Reveal({ delay = 0, y = 24, ...props }: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  const { ref, state } = useReveal<HTMLDivElement>();
  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={state === "hidden" ? { opacity: 0, y } : { opacity: 1, y: 0 }}
      transition={state === "hidden" ? { duration: 0 } : { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    />
  );
}

/** Counts up to a value the first time it becomes visible. Server-renders the final value. */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("en-GB"), className }: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(format(value));

  useEffect(() => {
    if (!inView || reduce || value === 0) return;
    const controls = animate(0, value, { duration: 1.6, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setDisplay(format(v)) });
    return () => controls.stop();
    // format is a stable inline function in practice; re-running on value change is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}

/** Money counter: value in pence. */
export function MoneyCountUp({ cents, className }: { cents: number; className?: string }) {
  return (
    <CountUp
      value={cents / 100}
      className={className}
      format={(n) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n)}
    />
  );
}
