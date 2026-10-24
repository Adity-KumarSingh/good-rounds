"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl font-semibold">Something went wrong.</h1>
      <p className="mt-2 max-w-md text-cream-muted">
        Please try again. If it keeps happening, the service may be temporarily unavailable.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-cream-dim">Ref: {error.digest}</p>}
      <div className="mt-8 flex gap-3">
        <button onClick={reset} className="btn-primary">Try again</button>
        <Link href="/" className="btn-secondary">Home</Link>
      </div>
    </div>
  );
}
