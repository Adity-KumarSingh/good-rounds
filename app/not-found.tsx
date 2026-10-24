import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-8xl font-semibold text-gradient">404</p>
      <h1 className="mt-4 font-display text-3xl font-semibold">We couldn&apos;t find that page.</h1>
      <p className="mt-2 text-cream-muted">It may have moved, or the link might be out of date.</p>
      <Link href="/" className="btn-primary mt-8">
        Back home
      </Link>
    </div>
  );
}
