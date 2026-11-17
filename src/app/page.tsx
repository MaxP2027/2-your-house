import Link from "next/link";
export default function Home() {
  return (
    <>
      <header>
        <Link href="/" className="brand">
          HVAC Connect<span>Local people. Lasting comfort.</span>
        </Link>
        <nav>
          <a href="#how-it-works">How it works</a>
          <Link href="/login">Log in</Link>
          <Link className="button" href="/signup">
            Create account
          </Link>
        </nav>
      </header>
      <main>
        <section className="hero">
          <p className="eyebrow">A better connection for your home</p>
          <h1>
            Comfort starts
            <br />
            with a connection.
          </h1>
          <p className="intro">
            Meet a new way to connect with independent HVAC technicians in your
            city. A place for homeowners seeking help and professionals ready to
            make a difference.
          </p>
          <div className="actions">
            <Link className="button" href="/signup?role=customer">
              Find HVAC Help →
            </Link>
            <Link className="secondary" href="/signup?role=technician">
              Join as a Technician
            </Link>
          </div>
          <p className="note">
            Start with your account. Service requests and local technician
            discovery are coming in a future release.
          </p>
        </section>
        <section id="how-it-works">
          <p className="eyebrow">The connection we&apos;re building</p>
          <h2>From a problem to a plan.</h2>
          <div className="grid">
            {[
              [
                "01",
                "Describe the problem",
                "Share what is happening with your heating or cooling system.",
              ],
              [
                "02",
                "Connect with a technician",
                "Find independent professionals serving your community.",
              ],
              [
                "03",
                "Arrange service",
                "Discuss the details and agree on the next steps.",
              ],
            ].map(([n, t, d]) => (
              <article key={n}>
                <span className="number">{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="grid benefits">
          <article>
            <p className="eyebrow">For homeowners</p>
            <h2>Your home. More options.</h2>
            <p>
              We&apos;re building a simpler way to find local HVAC help and keep
              your service conversations together.
            </p>
            <Link href="/signup?role=customer">
              Create a customer account →
            </Link>
          </article>
          <article>
            <p className="eyebrow">For technicians</p>
            <h2>Your skills. Your community.</h2>
            <p>
              Build your independent presence and get ready to connect with
              homeowners near you.
            </p>
            <Link href="/signup?role=technician">
              Create a technician account →
            </Link>
          </article>
        </section>
      </main>
      <footer>
        <Link href="/">HVAC Connect</Link>
        <Link href="/login">Log in</Link>
        <Link href="/signup">Create account</Link>
      </footer>
    </>
  );
}
