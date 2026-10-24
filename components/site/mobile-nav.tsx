"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function MobileNav({
  nav,
  account,
  signOutAction,
}: {
  nav: { href: string; label: string }[];
  account: { href: string; label: string } | null;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="md:hidden">
      <button className="btn-ghost px-2.5" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute inset-x-0 top-16 border-b border-white/10 bg-ink/95 px-4 pb-6 pt-2 backdrop-blur-xl"
          >
            <nav className="flex flex-col">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base text-cream hover:bg-white/5">
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2">
              {account ? (
                <>
                  <Link href={account.href} className="btn-primary">
                    {account.label}
                  </Link>
                  <form action={signOutAction}>
                    <button className="btn-secondary w-full">Sign out</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/signup" className="btn-primary">
                    Start giving
                  </Link>
                  <Link href="/login" className="btn-secondary">
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
