/** Translate database errors into messages a user can act on. */
export function friendlyDbError(error: { code?: string; message: string } | null | undefined): string {
  if (!error) return "Something went wrong.";
  const msg = error.message ?? "";
  if (error.code === "23505" && msg.includes("scores_one_per_date"))
    return "You already have a score for that date. Edit or delete that entry instead.";
  if (msg.includes("SCORE_TOO_OLD"))
    return "That round is older than all 5 of your retained scores, so it would be dropped straight away. Only your latest 5 rounds count.";
  if (msg.includes("SCORE_FUTURE_DATE")) return "A score can't be dated in the future.";
  if (error.code === "23514" && msg.includes("score")) return "Scores must be between 1 and 45 (Stableford).";
  if (error.code === "42501" || msg.includes("row-level security"))
    return "You need an active subscription to do that.";
  if (msg.includes("DRAW_NOT_SIMULATED")) return "Run a simulation before publishing.";
  if (msg.includes("LATER_DRAW_PUBLISHED")) return "A later month has already been published; draws must be published in order.";
  return msg;
}
