import type { Metadata } from "next";
import { Reveal } from "@/components/ui/motion";
import { createClient } from "@/lib/supabase/server";
import type { Charity } from "@/lib/types";
import { CharityDirectory } from "./directory";

export const metadata: Metadata = { title: "Charities" };

export default async function CharitiesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("charities").select("*").eq("active", true).order("featured", { ascending: false }).order("name");
  const charities = (data ?? []) as Charity[];

  return (
    <div className="container-page py-16 sm:py-20">
      <Reveal className="max-w-2xl">
        <p className="eyebrow">Charity directory</p>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight">Choose who you play for.</h1>
        <p className="mt-4 text-lg text-cream-muted">
          Every member backs one of these causes with part of their subscription. You can switch charity or raise your
          share at any time, or make a one-off donation without subscribing.
        </p>
      </Reveal>
      <CharityDirectory charities={charities} />
    </div>
  );
}
