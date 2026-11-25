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
      title="Log in"
      intro="Open your workspace to manage appointments and messages."
      links={
        <>
          <Link href="/signup">Create an account</Link>
          <Link href="/check-email">Email confirmation help</Link>
        </>
      }
    >
      <AccountForm
        mode="login"
        role={q.role === "technician" ? "technician" : "customer"}
      />
    </AccountShell>
  );
}
