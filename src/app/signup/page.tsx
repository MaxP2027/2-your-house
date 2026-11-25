import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccount } from "@/lib/auth";
import AccountForm from "@/components/account-form";
import AccountShell from "@/components/account-shell";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  if (await getAccount()) redirect("/dashboard");
  const q = await searchParams;
  return (
    <AccountShell
      title="Create your account"
      intro="Choose a customer account to request a visit or a technician account to list your availability."
      links={
        <>
          <Link href="/login">Already have an account? Log in</Link>
          <Link href="/check-email">Email confirmation help</Link>
        </>
      }
    >
      <AccountForm
        mode="signup"
        role={q.role === "technician" ? "technician" : "customer"}
      />
    </AccountShell>
  );
}
