import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Charity } from "@/lib/types";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const session = await requireUser("/checkout");
  if (session.isSubscriber) redirect("/dashboard");
  if (session.isAdmin) redirect("/admin");

  const { plan } = await searchParams;
  const supabase = await createClient();
  const { data: charities } = await supabase.from("charities").select("id, name").eq("active", true).order("name");
  const current = charities?.find((c) => c.id === session.profile.charity_id) ?? null;

  return (
    <div className="container-page flex justify-center py-12 sm:py-16">
      <div className="w-full max-w-3xl">
        <p className="eyebrow">{session.status === "none" ? "Final step" : "Welcome back"}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
          {session.status === "none" ? "Activate your membership" : "Restart your membership"}
        </h1>
        {session.status === "lapsed" && <p className="mt-2 text-cream-muted">Your last renewal didn&apos;t go through. Restart below to rejoin the draws.</p>}
        <CheckoutForm
          initialPlan={plan === "yearly" ? "yearly" : "monthly"}
          charity={current as Pick<Charity, "id" | "name"> | null}
          charities={(charities ?? []) as Pick<Charity, "id" | "name">[]}
          charityPercent={session.profile.charity_percent}
        />
      </div>
    </div>
  );
}
