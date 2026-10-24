import { AppShell } from "@/components/app-shell";
import type { NavItem } from "@/components/shell-nav";
import { requireUser } from "@/lib/auth";

// Subscription status must be checked live on every request.
export const dynamic = "force-dynamic";

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "Gauge", exact: true },
  { href: "/dashboard/winnings", label: "Winnings", icon: "Trophy" },
  { href: "/dashboard/settings", label: "Settings", icon: "Settings" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  const nav = session.isAdmin ? [...NAV, { href: "/admin", label: "Admin panel", icon: "BarChart3" } as NavItem] : NAV;
  return (
    <AppShell nav={nav} title="Member" user={{ name: session.profile.full_name, email: session.email }}>
      {children}
    </AppShell>
  );
}
