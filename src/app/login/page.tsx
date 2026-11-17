import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccount } from "@/lib/auth";
import AccountForm from "@/components/account-form";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  if (await getAccount()) redirect("/dashboard");
  const q = await searchParams;
  return (
    <main className="account">
      <Link href="/">← HVAC Connect</Link>
      <h1>Welcome back.</h1>
      <p>Log in to access your account.</p>
      <AccountForm
        mode="login"
        role={q.role === "technician" ? "technician" : "customer"}
      />
      <p>
        <Link href="/signup">New here? Create account</Link>
      </p>
      <Link href="/check-email">Email confirmation help</Link>
    </main>
  );
}
