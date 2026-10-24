"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CharityCard } from "@/components/charity-card";
import type { Charity } from "@/lib/types";

export function CharityDirectory({ charities }: { charities: Charity[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => ["All", ...Array.from(new Set(charities.map((c) => c.category))).sort()], [charities]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return charities.filter(
      (c) =>
        (category === "All" || c.category === category) &&
        (!q || [c.name, c.tagline, c.description, c.location, c.category].some((f) => f.toLowerCase().includes(q))),
    );
  }, [charities, query, category]);

  return (
    <div className="mt-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-dim" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, cause or place"
            aria-label="Search charities"
            className="input pl-11"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by category">
          {categories.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={clsx(
                "rounded-full px-4 py-1.5 text-sm transition",
                category === c ? "bg-cream text-ink" : "bg-white/5 text-cream-muted hover:bg-white/10 hover:text-cream",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <motion.div layout className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {filtered.map((c) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
            >
              <CharityCard charity={c} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {!filtered.length && (
        <p className="mt-16 text-center text-cream-muted">
          No charities match &ldquo;{query}&rdquo;{category !== "All" && ` in ${category}`}.
        </p>
      )}
    </div>
  );
}
