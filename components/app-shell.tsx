import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { Logo } from "./site/logo";
import { ShellNav, type NavItem } from "./shell-nav";

/** Shared chrome for the member dashboard and the admin panel. */
export function AppShell({
  nav,
  title,
  user,
  children,
}: {
  nav: NavItem[];
  title: string;
  user: { name: string; email: string };
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-800/90 backdrop-blur lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          <Logo />
          <form action={signOut} className="lg:hidden">
            <button className="btn-ghost px-2.5" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
        <p className="hidden px-6 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-cream-dim lg:block">{title}</p>
        <ShellNav items={nav} />
        <div className="absolute inset-x-0 bottom-0 hidden border-t border-white/[0.06] p-4 lg:block">
          <p className="truncate text-sm font-semibold">{user.name || "Member"}</p>
          <p className="truncate text-xs text-cream-dim">{user.email}</p>
          <form action={signOut} className="mt-3">
            <button className="btn-ghost w-full justify-start px-3">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-cream-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint?: React.ReactNode; accent?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-cream-dim">{label}</p>
      <p className={`mt-2 font-display text-3xl font-semibold ${accent ?? ""}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-cream-muted">{hint}</p>}
    </div>
  );
}
