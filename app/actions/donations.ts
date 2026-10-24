"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { paymentProvider } from "@/lib/subscription";
import type { ActionState } from "@/lib/types";

const donationSchema = z.object({
  charity_id: z.string().uuid(),
  amount: z.coerce.number({ invalid_type_error: "Enter an amount." }).min(1, "The minimum donation is £1.").max(10000, "For gifts over £10,000 please contact us."),
  donor_name: z.string().trim().max(80).optional(),
  donor_email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address.")]).optional(),
  message: z.string().trim().max(280).optional(),
  card_number: z.string().optional(),
});

/** Independent donation (PRD §08.1) — open to anyone, not tied to a subscription or the draw. */
export async function donate(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = donationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const amountCents = Math.round(d.amount * 100);

  const db = createAdminClient();
  const { data: charity } = await db.from("charities").select("id, slug, name").eq("id", d.charity_id).eq("active", true).maybeSingle();
  if (!charity) return { error: "That charity is no longer accepting donations." };

  const charge = await paymentProvider.charge({ amountCents, description: `Donation to ${charity.name}`, cardNumber: d.card_number });
  if (!charge.ok) return { error: charge.error };

  const session = await getSession();
  const { error } = await db.from("donations").insert({
    charity_id: charity.id,
    user_id: session?.userId ?? null,
    donor_name: d.donor_name || session?.profile.full_name || "Anonymous",
    donor_email: d.donor_email || session?.email || null,
    amount_cents: amountCents,
    message: d.message || null,
    provider_ref: charge.reference,
  });
  if (error) return { error: error.message };

  revalidatePath(`/charities/${charity.slug}`);
  return { ok: true, message: `Thank you! Your gift to ${charity.name} has been received.` };
}
