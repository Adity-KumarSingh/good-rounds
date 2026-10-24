import { AppShell } from "@/components/app-shell";
import type { NavItem } from "@/components/shell-nav";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV: NavItem[] = [
  { href: "/admin", label: "Reports", icon: "BarChart3", exact: true },
  { href: "/admin/users", label: "Users", icon: "Users" },
  { href: "/admin/draws", label: "Draws", icon: "Ticket" },
  { href: "/admin/charities", label: "Charities", icon: "HeartHandshake" },
  { href: "/admin/winners", label: "Winners", icon: "Trophy" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <AppShell nav={NAV} title="Admin" user={{ name: session.profile.full_name, email: session.email }}>
      {children}
    </AppShell>
  );
}
