"use client";

import clsx from "clsx";
import { Check, Lock, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import type { ActionState, Score } from "@/lib/types";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { formatDate, todayISO } from "@/lib/format";

type SaveAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Score entry + edit interface. Shared by the member dashboard and the admin
 * user editor; the caller passes in the server actions to use.
 */
export function ScoreManager({
  scores,
  locked = false,
  addAction,
  updateAction,
  deleteAction,
  hiddenFields,
}: {
  scores: Score[];
  locked?: boolean;
  addAction: SaveAction;
  updateAction: SaveAction;
  deleteAction: (id: string) => Promise<ActionState>;
  hiddenFields?: Record<string, string>;
}) {
  const [addState, add] = useActionState(addAction, null);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleteState, setDeleteState] = useState<ActionState>(null);
  const [pendingDelete, startDelete] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (addState?.ok) formRef.current?.reset();
  }, [addState]);

  const sorted = [...scores].sort((a, b) => b.played_on.localeCompare(a.played_on));
  const full = sorted.length >= 5;

  return (
    <div className="relative">
      {/* progress dots */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={clsx("h-2.5 w-8 rounded-full transition-all duration-300", i < sorted.length ? "scale-100 bg-mint" : "scale-90 bg-white/10")}
            />
          ))}
        </div>
        <p className="text-sm text-cream-muted">
          {full ? "5 of 5. You're in the next draw." : `${sorted.length} of 5 logged. Add ${5 - sorted.length} more to enter the draw.`}
        </p>
      </div>

      {!locked && (
        <form ref={formRef} action={add} className="flex flex-col gap-2 rounded-2xl border border-dashed border-white/15 p-3 sm:flex-row sm:items-center">
          {hiddenFields && Object.entries(hiddenFields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <input name="score" type="number" min={1} max={45} required placeholder="Score (1–45)" aria-label="Stableford score" className="input sm:w-36" />
          <input name="played_on" type="date" max={todayISO()} defaultValue={todayISO()} required aria-label="Date played" className="input sm:w-44" />
          <SubmitButton className="btn-primary sm:ml-auto" pendingText="Saving…">
            <Plus className="h-4 w-4" /> Add score
          </SubmitButton>
        </form>
      )}
      {!locked && full && (
        <p className="mt-2 text-xs text-cream-dim">Adding a new round replaces your oldest one automatically.</p>
      )}
      <FormMessage state={addState} className="mt-3" />
      <FormMessage state={deleteState} className="mt-3" />

      <ul className="mt-4 space-y-2">
        {sorted.map((s, i) => (
            // Plain CSS entrance: list rows re-render inside server-action transitions,
            // so they must not depend on JS animation lifecycles.
            <li key={s.id} className="animate-rise rounded-2xl bg-ink/60 ring-1 ring-white/[0.06] [animation-duration:0.35s]">
              {editing === s.id ? (
                <EditRow score={s} action={updateAction} hiddenFields={hiddenFields} onDone={() => setEditing(null)} />
              ) : (
                <div className="flex items-center gap-4 px-4 py-3">
                  <span
                    className={clsx(
                      "flex h-11 w-11 items-center justify-center rounded-full font-display text-lg font-semibold",
                      i === 0 ? "bg-gradient-to-br from-gold-soft to-ember text-ink" : "bg-ink-600 text-cream",
                    )}
                  >
                    {s.score}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{formatDate(s.played_on, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
                    <p className="text-xs text-cream-dim">{i === 0 ? "Most recent" : i === 4 ? "Oldest. Replaced next" : "Stableford points"}</p>
                  </div>
                  {!locked && (
                    <div className="flex gap-1">
                      <button className="btn-ghost px-2.5" onClick={() => setEditing(s.id)} aria-label="Edit score">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="btn-ghost px-2.5 hover:text-red-300"
                        disabled={pendingDelete}
                        aria-label="Delete score"
                        onClick={() => {
                          if (!window.confirm("Delete this score?")) return;
                          startDelete(async () => setDeleteState(await deleteAction(s.id)));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
      </ul>
      {!sorted.length && <p className="mt-6 text-center text-sm text-cream-dim">No scores yet. Log your first round above.</p>}

      {locked && (
        <div className="absolute inset-0 -m-2 flex flex-col items-center justify-center rounded-2xl bg-ink/80 p-6 text-center backdrop-blur-sm">
          <Lock className="h-6 w-6 text-ember" />
          <p className="mt-3 font-semibold">Scores are for active members</p>
          <p className="mt-1 max-w-xs text-sm text-cream-muted">Subscribe to log rounds and enter the monthly draw.</p>
          <Link href="/checkout" className="btn-primary mt-4">
            Subscribe
          </Link>
        </div>
      )}
    </div>
  );
}

function EditRow({
  score,
  action,
  hiddenFields,
  onDone,
}: {
  score: Score;
  action: SaveAction;
  hiddenFields?: Record<string, string>;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(action, null);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-2 p-3">
      <input type="hidden" name="id" value={score.id} />
      {hiddenFields && Object.entries(hiddenFields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input name="score" type="number" min={1} max={45} required defaultValue={score.score} aria-label="Score" className="input sm:w-28" />
        <input name="played_on" type="date" max={todayISO()} required defaultValue={score.played_on} aria-label="Date played" className="input sm:w-44" />
        <div className="flex gap-1 sm:ml-auto">
          <SubmitButton className="btn-primary px-3" aria-label="Save">
            <Check className="h-4 w-4" /> Save
          </SubmitButton>
          <button type="button" onClick={onDone} className="btn-ghost px-3" aria-label="Cancel">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
