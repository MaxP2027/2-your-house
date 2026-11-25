import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";

export default function AccountShell({
  title,
  intro,
  children,
  links,
}: {
  title: string;
  intro: string;
  children: ReactNode;
  links: ReactNode;
}) {
  return (
    <>
      <header className="site-header">
        <div className="site-container header-row">
          <Brand />
          <Link className="text-link" href="/">
            Back to homepage
          </Link>
        </div>
      </header>
      <main className="account-layout">
        <aside className="account-aside">
          <p className="eyebrow">HVAC Connect</p>
          <p className="account-aside-title">
            Heating and cooling help, close to home.
          </p>
          <p>Find independent technicians or manage the visits you take on.</p>
        </aside>
        <section className="account-card" aria-labelledby="account-title">
          <h1 id="account-title">{title}</h1>
          <p className="account-intro">{intro}</p>
          {children}
          <div className="account-links">{links}</div>
        </section>
      </main>
    </>
  );
}
