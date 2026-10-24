import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { CharityForm } from "../charity-form";

export default async function NewCharityPage() {
  await requireAdmin();
  return (
    <>
      <Link href="/admin/charities" className="btn-ghost -ml-3 mb-4">
        <ArrowLeft className="h-4 w-4" /> Charities
      </Link>
      <PageHeader title="Add charity" />
      <div className="card max-w-3xl p-6">
        <CharityForm />
      </div>
    </>
  );
}
