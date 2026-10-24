import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Charity } from "@/lib/types";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Join" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ plan?: string; charity?: string }> }) {
  const session = await getSession();
  if (session) redirect(session.isSubscriber ? "/dashboard" : "/checkout");

  const { plan, charity } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("charities").select("id, name, tagline, category, slug").eq("active", true).order("featured", { ascending: false }).order("name");

  return (
    <div className="container-page flex justify-center py-12 sm:py-16">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <p className="eyebrow">Become a member</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Who will you play for?</h1>
        </div>
        <SignupForm
          charities={(data ?? []) as Pick<Charity, "id" | "name" | "tagline" | "category" | "slug">[]}
          initialPlan={plan === "yearly" ? "yearly" : "monthly"}
          initialCharity={charity}
        />
        <p className="mt-6 text-center text-sm text-cream-muted">
          Already a member?{" "}
          <Link href="/login" className="font-semibold text-ember hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
