import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Fan,
  MapPin,
  MessageSquare,
} from "lucide-react";
import { Brand } from "@/components/brand";

const customerSignup = "/signup?role=customer";
const technicianSignup = "/signup?role=technician";
const steps = [
  {
    title: "Find a technician",
    detail:
      "Filter by service city and compare technicians, services, and listed appointment times.",
  },
  {
    title: "Request an appointment",
    detail:
      "Choose an available time and describe what is happening with your heating or cooling.",
  },
  {
    title: "Get confirmation",
    detail:
      "Your technician reviews the request. Keep questions and visit details in a private conversation.",
  },
];

export default function Home() {
  return (
    <div className="site">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="site-container header-row">
          <Brand />
          <nav aria-label="Main navigation" className="site-nav">
            <a href="#how-it-works">How it works</a>
            <Link href="/login">Log in</Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section
          className="site-container home-hero"
          aria-labelledby="home-title"
        >
          <div className="hero-copy">
            <h1 id="home-title">
              Find local
              <br />
              HVAC help.
            </h1>
            <p>
              Connect with independent heating and cooling technicians in your
              city. See when they’re available, request a visit, and message
              them in one place.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={customerSignup}>
                Find HVAC help <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a className="text-link" href="#for-technicians">
                For technicians
              </a>
            </div>
          </div>
          <figure className="hero-figure">
            <div className="hero-photo">
              <Image
                src="/images/home-heat-pump.webp"
                alt="Outdoor heat pump beside the brick wall of a house"
                fill
                sizes="(min-width: 1280px) 590px, (min-width: 800px) 48vw, 94vw"
                loading="eager"
                fetchPriority="high"
              />
            </div>
            <figcaption>
              Illustrative image of a residential heat pump
            </figcaption>
          </figure>
        </section>

        <div className="feature-strip">
          <ul className="site-container" aria-label="Marketplace features">
            <li>
              <MapPin size={20} aria-hidden="true" /> Find technicians by city
            </li>
            <li>
              <CalendarDays size={20} aria-hidden="true" /> See listed
              availability
            </li>
            <li>
              <MessageSquare size={20} aria-hidden="true" /> Message privately
            </li>
          </ul>
        </div>

        <section
          id="how-it-works"
          className="site-container booking-guide"
          aria-labelledby="booking-title"
        >
          <h2 id="booking-title">How booking works</h2>
          <ol className="booking-steps">
            {steps.map(({ title, detail }) => (
              <li key={title}>
                <div>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="for-technicians"
          className="trade-panel"
          aria-labelledby="technicians-title"
        >
          <div className="site-container trade-inner">
            <div>
              <p className="eyebrow">For independent technicians</p>
              <h2 id="technicians-title">Schedule work in your city.</h2>
              <p>
                List your services, publish times that work for you, and manage
                incoming requests in your daily agenda.
              </p>
            </div>
            <Link className="button button-light" href={technicianSignup}>
              Join as a technician <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section
          className="site-container question-section"
          aria-labelledby="questions-title"
        >
          <h2 id="questions-title">Before you book</h2>
          <div className="question-list">
            <details>
              <summary>Is my appointment confirmed when I request it?</summary>
              <p>
                Your request reserves the time while the technician reviews it.
                The visit is confirmed when they accept.
              </p>
            </details>
            <details>
              <summary>When can a technician see my address?</summary>
              <p>
                Before accepting, the technician sees the approximate area. The
                exact address becomes available to the assigned technician once
                the visit is accepted.
              </p>
            </details>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="site-container footer-row">
          <Brand />
          <nav aria-label="Footer">
            <Link href="/login">Log in</Link>
            <Link href={customerSignup}>Create a customer account</Link>
          </nav>
        </div>
      </footer>
      <div className="mobile-book">
        <Link className="button button-primary" href={customerSignup}>
          <Fan size={19} aria-hidden="true" /> Find HVAC help{" "}
          <ArrowRight className="mobile-arrow" size={18} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
