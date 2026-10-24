import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <div className="container-page flex justify-center py-16 sm:py-24">
      <div className="card w-full max-w-md p-8">
        <h1 className="font-display text-3xl font-semibold">Welcome back</h1>
        <p className="mt-2 text-sm text-cream-muted">Sign in to log scores and check your draws.</p>
        {error === "confirm" && (
          <p className="mt-4 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">That confirmation link is invalid or expired.</p>
        )}
        <LoginForm next={next} />
        <p className="mt-6 text-center text-sm text-cream-muted">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-ember hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
