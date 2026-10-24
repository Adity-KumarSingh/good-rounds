import Link from "next/link";
import { SITE_NAME } from "@/lib/config";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/[0.06]">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 lg:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-cream-muted">
            Play your game, back a cause, win monthly. Every subscription funds a charity you choose.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Platform</p>
          <Link href="/#how-it-works" className="block text-cream-muted hover:text-cream">How it works</Link>
          <Link href="/draws" className="block text-cream-muted hover:text-cream">Draw results</Link>
          <Link href="/pricing" className="block text-cream-muted hover:text-cream">Pricing</Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Giving</p>
          <Link href="/charities" className="block text-cream-muted hover:text-cream">Charity directory</Link>
          <Link href="/signup" className="block text-cream-muted hover:text-cream">Become a member</Link>
          <Link href="/login" className="block text-cream-muted hover:text-cream">Sign in</Link>
        </div>
      </div>
      <div className="container-page flex flex-col gap-2 border-t border-white/[0.06] py-6 text-xs text-cream-dim sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} {SITE_NAME}. Built for the Digital Heroes selection process.</p>
        <p>Payments run in test mode. No real money moves.</p>
      </div>
    </footer>
  );
}
