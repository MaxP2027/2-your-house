import Link from "next/link";
import AccountForm from "@/components/account-form";
export default function Page() {
  return (
    <main className="account">
      <Link href="/">← HVAC Connect</Link>
      <h1>Check your inbox.</h1>
      <p>
        Follow the confirmation link in your email before logging in. Check your
        spam folder too. If your link has expired or is invalid, request a fresh
        one below.
      </p>
      <AccountForm mode="resend" />
      <p>
        <Link href="/login">Back to login</Link>
      </p>
    </main>
  );
}
