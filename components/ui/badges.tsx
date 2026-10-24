import clsx from "clsx";

const TONES = {
  mint: "bg-mint/10 text-mint ring-1 ring-mint/25",
  ember: "bg-ember/10 text-ember-soft ring-1 ring-ember/25",
  gold: "bg-gold/10 text-gold ring-1 ring-gold/25",
  iris: "bg-iris/10 text-iris-soft ring-1 ring-iris/25",
  muted: "bg-white/5 text-cream-muted ring-1 ring-white/10",
  red: "bg-red-500/10 text-red-300 ring-1 ring-red-400/25",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ tone = "muted", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={clsx("badge", TONES[tone], className)}>{children}</span>;
}

const STATUS: Record<string, { tone: Tone; label: string }> = {
  active: { tone: "mint", label: "Active" },
  cancelled: { tone: "muted", label: "Cancelled" },
  lapsed: { tone: "red", label: "Lapsed" },
  none: { tone: "muted", label: "Not subscribed" },
  draft: { tone: "muted", label: "Draft" },
  simulated: { tone: "iris", label: "Simulated" },
  published: { tone: "mint", label: "Published" },
  awaiting_proof: { tone: "gold", label: "Awaiting proof" },
  pending_review: { tone: "iris", label: "In review" },
  approved: { tone: "mint", label: "Approved" },
  rejected: { tone: "red", label: "Rejected" },
  pending: { tone: "gold", label: "Payout pending" },
  paid: { tone: "mint", label: "Paid" },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const s = STATUS[status] ?? { tone: "muted" as Tone, label: status };
  return <Badge tone={s.tone}>{label ?? s.label}</Badge>;
}
