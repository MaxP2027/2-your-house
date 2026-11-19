import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccount } from "@/lib/auth";
import AccountForm from "@/components/account-form";
import Workspace from "@/components/marketplace/workspace";
import "../marketplace.css";
export const dynamic = "force-dynamic";
export default async function Page() {
  const account = await getAccount();
  if (!account) redirect("/login");
  return (
    <div className="workspace">
      <a className="skip-link" href="#workspace-main">
        Skip to workspace
      </a>
      <header className="workspace-header">
        <Link href="/" className="workspace-brand">
          HVAC Connect<span>Local people. Lasting comfort.</span>
        </Link>
        <div className="workspace-header-actions">
          <Link href="/">Homepage</Link>
          <details className="account-menu">
            <summary>Your account</summary>
            <div>
              <strong>{account.profile?.full_name ?? "Account"}</strong>
              <p>{account.user.email}</p>
              <p>Account type: {account.profile?.role ?? "Unavailable"}</p>
              <AccountForm mode="logout" />
            </div>
          </details>
        </div>
      </header>
      {account.profile ? (
        <Workspace
          role={account.profile.role}
          fullName={account.profile.full_name}
        />
      ) : (
        <main id="workspace-main" className="work-card">
          <h1>Your profile is unavailable</h1>
          <p role="alert">
            We could not load your account profile. Please try again later.
          </p>
          <AccountForm mode="logout" />
        </main>
      )}
    </div>
  );
}
