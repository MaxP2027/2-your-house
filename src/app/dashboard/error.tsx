"use client";
import Link from "next/link";
export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <main className="account">
      <h1>Your workspace is unavailable</h1>
      <p>
        We could not load your account. Please check your connection and try
        again.
      </p>
      <button onClick={reset}>Try again</button>
      <p>
        <Link href="/">Return to homepage</Link>
      </p>
    </main>
  );
}
