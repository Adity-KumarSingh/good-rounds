import { NextResponse } from "next/server";
import { reconcileSubscription } from "@/lib/billing";
import { fetchAll } from "@/lib/draws";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Subscription } from "@/lib/types";

/**
 * Daily lifecycle job (see vercel.json): renews due subscriptions, closes
 * cancelled ones and lapses failed renewals. Signed-in users are also
 * reconciled on each request, so this mainly keeps reports accurate for
 * users who haven't visited recently.
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const due = await fetchAll<Subscription>((from, to) =>
    db.from("subscriptions").select("*").eq("status", "active").lte("current_period_end", new Date().toISOString()).order("id").range(from, to),
  );

  const results = { renewed: 0, cancelled: 0, lapsed: 0 };
  for (const sub of due) {
    const updated = await reconcileSubscription(sub);
    if (updated.status === "active") results.renewed++;
    else if (updated.status === "cancelled") results.cancelled++;
    else results.lapsed++;
  }

  return NextResponse.json({ processed: due.length, ...results });
}
