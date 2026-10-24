import { Heart, Sparkles } from "lucide-react";

/**
 * Hero illustration: a "this month" card with drawn numbers and a charity
 * impact card — the product's promise in one glance. Entrance animations are
 * pure CSS so they play (and the content shows) even before JS hydrates.
 */
export function HeroVisual({ poolLabel, raisedLabel, charityName }: { poolLabel: string; raisedLabel: string; charityName: string }) {
  const numbers = [7, 18, 29, 34, 41];

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      <div className="absolute inset-8 rounded-full bg-gradient-to-br from-ember/40 via-gold/20 to-mint/30 blur-3xl" />

      <div className="absolute left-0 top-8 w-[78%] -rotate-[4deg]">
        <div className="card animate-rise p-6 shadow-2xl">
          <p className="eyebrow">This month&apos;s prize pool</p>
          <p className="mt-2 font-display text-4xl font-semibold">{poolLabel}</p>
          <div className="mt-5 flex gap-2">
            {numbers.map((n, i) => (
              <span
                key={n}
                style={{ animationDelay: `${0.5 + i * 0.12}s` }}
                className="flex h-10 w-10 animate-pop items-center justify-center rounded-full bg-gradient-to-br from-gold-soft to-ember font-display text-sm font-semibold text-ink shadow-[inset_0_-4px_8px_rgba(0,0,0,0.3)]"
              >
                {n}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs text-cream-dim">Your 5 latest scores are your numbers.</p>
        </div>
      </div>

      <div className="absolute bottom-6 right-0 w-[72%] rotate-3">
        <div className="animate-rise [animation-delay:0.25s]">
          <div className="card animate-float p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mint/15 text-mint">
                <Heart className="h-5 w-5 fill-current" />
              </span>
              <div>
                <p className="text-xs text-cream-dim">Raised by members</p>
                <p className="font-display text-2xl font-semibold">{raisedLabel}</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
              <div className="h-full w-[72%] animate-grow rounded-full bg-gradient-to-r from-mint to-gold" />
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-cream-muted">
              <Sparkles className="h-3.5 w-3.5 text-gold" /> Spotlight: {charityName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
