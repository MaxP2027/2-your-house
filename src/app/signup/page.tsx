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
      <h1>Make yourself at home.</h1>
      <p>Create an account to get started.</p>
      <AccountForm
        mode="signup"
        role={q.role === "technician" ? "technician" : "customer"}
      />
      <p>
        <Link href="/login">Already have an account? Log in</Link>
      </p>
      <Link href="/check-email">Email confirmation help</Link>
    </main>
  );
}
