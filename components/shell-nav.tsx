"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import { BarChart3, Gauge, HeartHandshake, Settings, Ticket, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Icons are passed by name so the nav config can live in Server Components. */
const ICONS = { BarChart3, Gauge, HeartHandshake, Settings, Ticket, Trophy, Users };

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  exact?: boolean;
}

export function ShellNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "relative flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
              active ? "text-cream" : "text-cream-muted hover:bg-white/[0.04] hover:text-cream",
            )}
          >
            {active && (
              <motion.span
                layoutId="shell-nav-active"
                className="absolute inset-0 rounded-xl bg-white/[0.07] ring-1 ring-white/10"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <Icon className={clsx("relative h-4 w-4", active && "text-ember")} />
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
