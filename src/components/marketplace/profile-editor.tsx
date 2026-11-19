"use client";
import { useState } from "react";
import type { Technician, Slot, Mutation } from "./types";
import { slotTime } from "./types";
export default function ProfileEditor({
  profile,
  fullName,
  slots,
  mutate,
  busy,
}: {
  profile: Technician | null;
  fullName: string;
  slots: Slot[];
  mutate: Mutation;
  busy: boolean;
}) {
  const [slotError, setSlotError] = useState("");
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    await mutate(
      {
        action: "saveProfile",
        display_name: values.display_name,
        city: values.city,
        bio: values.bio,
        services: values.services,
        accepting_requests: values.accepting_requests === "on",
      },
      "Your technician profile has been saved.",
    );
  }
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      values = Object.fromEntries(new FormData(form));
    const start = new Date(String(values.starts_at)),
      end = new Date(String(values.ends_at));
    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end <= start
    ) {
      setSlotError("Choose a valid end time after the start time.");
      return;
    }
    setSlotError("");
    if (
      await mutate(
        {
          action: "addSlot",
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
        },
        "Availability added.",
      )
    )
      form.reset();
  }
  return (
    <div className="profile-columns">
      <section className="work-card">
        <h2>Introduce yourself</h2>
        <p>
          Your name, service city, services and introduction appear in the
          technician directory. This profile does not represent license
          verification.
        </p>
        <form onSubmit={save} key={profile?.id ?? "new"}>
          <label>
            Display name
            <input
              name="display_name"
              required
              maxLength={100}
              defaultValue={profile?.display_name ?? fullName}
            />
          </label>
          <label>
            Service city
            <input
              name="city"
              required
              maxLength={100}
              defaultValue={profile?.city ?? ""}
              placeholder="City, State"
            />
          </label>
          <label>
            Services offered
            <input
              name="services"
              required
              maxLength={500}
              defaultValue={profile?.services ?? ""}
              placeholder="Heating repair, AC maintenance"
            />
          </label>
          <label>
            About your work
            <textarea
              name="bio"
              rows={4}
              required
              maxLength={1000}
              defaultValue={profile?.bio ?? ""}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="accepting_requests"
              defaultChecked={profile?.accepting_requests ?? true}
            />
            Accepting new appointment requests
          </label>
          <button disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
        </form>
      </section>
      <section className="work-card">
        <h2>Publish available slots</h2>
        <p>
          Offer specific times that customers can request. Pending requests
          reserve their slot until you respond.
        </p>
        {!profile ? (
          <p className="empty">
            Save your technician profile before adding availability.
          </p>
        ) : (
          <form onSubmit={add}>
            <div className="field-pair">
              <label>
                Start time
                <input name="starts_at" type="datetime-local" required />
              </label>
              <label>
                End time
                <input name="ends_at" type="datetime-local" required />
              </label>
            </div>
            <p className="muted">
              Times use your device&apos;s timezone. Slots must be in the
              future, last at most eight hours, and cannot overlap.
            </p>
            {slotError && <p role="alert">{slotError}</p>}
            <button disabled={busy}>Add availability</button>
          </form>
        )}
        <h3>Your open slots</h3>
        {slots.length === 0 ? (
          <p className="empty">No open slots yet.</p>
        ) : (
          <ul className="slot-list">
            {slots.map((slot) => (
              <li key={slot.id}>
                <span>{slotTime(slot.starts_at, slot.ends_at)}</span>
                <button
                  className="subtle"
                  disabled={busy}
                  onClick={() =>
                    mutate(
                      { action: "removeSlot", slot_id: slot.id },
                      "Availability removed.",
                    )
                  }
                  aria-label={
                    "Remove slot " + slotTime(slot.starts_at, slot.ends_at)
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
