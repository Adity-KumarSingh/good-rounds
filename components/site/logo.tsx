import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5" aria-label={`${SITE_NAME} home`}>
      <span className="relative flex h-8 w-8 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-ember to-gold transition duration-500 group-hover:rotate-180" />
        <span className="absolute inset-[5px] rounded-full bg-ink" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-mint" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">{SITE_NAME}</span>
    </Link>
  );
}
