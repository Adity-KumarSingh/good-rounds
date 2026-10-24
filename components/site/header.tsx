import Link from "next/link";
import { getSession } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";

const NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/charities", label: "Charities" },
  { href: "/draws", label: "Draws" },
  { href: "/pricing", label: "Pricing" },
];

export async function Header() {
  const session = await getSession();
  const account = session ? (session.isAdmin ? { href: "/admin", label: "Admin" } : { href: "/dashboard", label: "Dashboard" }) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink/75 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="btn-ghost px-3.5">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {account ? (
            <>
              <Link href={account.href} className="btn-secondary">
                {account.label}
              </Link>
              <form action={signOut}>
                <button className="btn-ghost">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary">
                Start giving
              </Link>
            </>
          )}
        </div>
        <MobileNav nav={NAV} account={account} signOutAction={signOut} />
      </div>
    </header>
  );
}
