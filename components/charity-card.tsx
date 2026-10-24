import clsx from "clsx";
import { ArrowUpRight, MapPin } from "lucide-react";
import Link from "next/link";
import type { Charity } from "@/lib/types";

const PALETTES = [
  ["#FF6B4A", "#F5C451"],
  ["#3DDC97", "#8B7CF6"],
  ["#8B7CF6", "#FF6B4A"],
  ["#F5C451", "#3DDC97"],
  ["#FF8F75", "#8B7CF6"],
  ["#7BE8B8", "#F5C451"],
];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Charity image, or generative abstract art derived from the slug when none is uploaded. */
export function CharityArt({ charity, className }: { charity: Pick<Charity, "slug" | "name" | "image_url">; className?: string }) {
  if (charity.image_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={charity.image_url} alt={charity.name} className={clsx("h-full w-full object-cover", className)} />;
  }
  const h = hash(charity.slug);
  const [a, b] = PALETTES[h % PALETTES.length];
  const cx = 20 + (h % 60);
  const cy = 20 + ((h >> 3) % 60);
  return (
    <div
      role="img"
      aria-label={charity.name}
      className={clsx("relative h-full w-full overflow-hidden", className)}
      style={{ background: `radial-gradient(circle at ${cx}% ${cy}%, ${a} 0%, transparent 55%), radial-gradient(circle at ${100 - cx}% ${100 - cy}%, ${b} 0%, transparent 60%), #15171d` }}
    >
      <div className="grain absolute inset-0 opacity-60" />
      <span className="absolute bottom-3 left-4 font-display text-5xl font-semibold text-white/15">
        {charity.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 3)}
      </span>
    </div>
  );
}

export function CharityCard({ charity }: { charity: Charity }) {
  return (
    <Link
      href={`/charities/${charity.slug}`}
      className="card group flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_20px_60px_-20px_rgba(255,107,74,0.35)]"
    >
      <div className="aspect-[16/9] overflow-hidden">
        <CharityArt charity={charity} className="transition duration-500 group-hover:scale-105" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2 text-xs text-cream-dim">
          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-cream-muted">{charity.category}</span>
          {charity.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {charity.location}
            </span>
          )}
        </div>
        <h3 className="font-display text-xl font-semibold leading-tight">{charity.name}</h3>
        <p className="flex-1 text-sm text-cream-muted">{charity.tagline}</p>
        <span className="flex items-center gap-1 text-sm font-semibold text-ember">
          Learn more <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
