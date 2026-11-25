import Link from "next/link";
import AccountForm from "@/components/account-form";
import AccountShell from "@/components/account-shell";

export default function Page() {
  return (
    <AccountShell
      title="Check your inbox."
      intro="Open the confirmation link we sent to your email before logging in. Check your spam folder, or request a new link below."
      links={<Link href="/login">Back to login</Link>}
    >
      <AccountForm mode="resend" />
    </AccountShell>
  );
}
