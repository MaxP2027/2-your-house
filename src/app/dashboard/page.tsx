import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccount } from "@/lib/auth";
import AccountForm from "@/components/account-form";
export const dynamic = "force-dynamic";
export default async function Page() {
  const account = await getAccount();
  if (!account) redirect("/login");
  return (
    <main className="account">
      <Link href="/">HVAC Connect</Link>
      <h1>Your account</h1>
      {account.profile ? (
        <>
          <h2>Welcome, {account.profile.full_name}</h2>
          <p>{account.user.email}</p>
          <p>Account type: {account.profile.role}</p>
          <p>
            {account.profile.role === "technician"
              ? "Your next local connection starts here."
              : "Your journey to a more comfortable home starts here."}{" "}
            Service requests are coming in a future release.
          </p>
        </>
      ) : (
        <p role="alert">Your profile is unavailable. Please try again later.</p>
      )}
      <AccountForm mode="logout" />
    </main>
  );
}
