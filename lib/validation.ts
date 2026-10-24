import { z } from "zod";
import { CHARITY_MAX_PERCENT, CHARITY_MIN_PERCENT, SCORE_MAX, SCORE_MIN } from "./config";
import { todayISO } from "./format";

export const scoreSchema = z.object({
  score: z.coerce
    .number({ invalid_type_error: "Enter a score." })
    .int("Scores are whole numbers.")
    .min(SCORE_MIN, `Stableford scores start at ${SCORE_MIN}.`)
    .max(SCORE_MAX, `Stableford scores go up to ${SCORE_MAX}.`),
  played_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date you played.")
    .refine((d) => d <= todayISO(), "A score can't be dated in the future."),
});

export const charityChoiceSchema = z.object({
  charity_id: z.string().uuid("Choose a charity to support."),
  charity_percent: z.coerce
    .number()
    .int()
    .min(CHARITY_MIN_PERCENT, `The minimum charity share is ${CHARITY_MIN_PERCENT}%.`)
    .max(CHARITY_MAX_PERCENT, `The maximum charity share is ${CHARITY_MAX_PERCENT}%.`),
});

export const uuid = z.string().uuid();
