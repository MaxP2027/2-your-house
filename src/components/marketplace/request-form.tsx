"use client";
import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Slot, Technician, Mutation, MapPoint } from "./types";
import { slotTime } from "./types";
const LocationMap = dynamic(() => import("./location-map"), {
  ssr: false,
  loading: () => <p className="muted">Loading map…</p>,
});
export default function RequestForm({
  technician,
  slots,
  mutate,
  busy,
  onClose,
}: {
  technician: Technician;
  slots: Slot[];
  mutate: Mutation;
  busy: boolean;
  onClose: () => void;
}) {
  const [latitude, setLatitude] = useState(""),
    [longitude, setLongitude] = useState("");
  const [validation, setValidation] = useState("");
  const pick = useCallback((lat: number, lng: number) => {
    setLatitude(String(lat));
    setLongitude(String(lng));
  }, []);
  const points = useMemo<MapPoint[]>(
    () =>
      latitude !== "" && longitude !== ""
        ? [
            {
              id: "home",
              latitude: Number(latitude),
              longitude: Number(longitude),
              label: "Your service location",
            },
          ]
        : [],
    [latitude, longitude],
  );
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setValidation("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    if (!latitude.trim() || !longitude.trim()) {
      setValidation("Choose a location on the map or enter both coordinates.");
      return;
    }
    if (
      await mutate(
        {
          action: "request",
          slot_id: values.slot_id,
          description: values.description,
          address: values.address,
          latitude: Number(latitude),
          longitude: Number(longitude),
        },
        "Request sent. The slot is reserved while the technician reviews it.",
      )
    )
      onClose();
  }
  return (
    <section className="work-card request-form" aria-labelledby="request-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Appointment request</p>
          <h2 id="request-title">
            Request a visit with {technician.display_name}
          </h2>
        </div>
        <button type="button" className="subtle" onClick={onClose}>
          Close
        </button>
      </div>
      <p>
        The technician will review your request before confirming. Your exact
        address is shared with them after acceptance.
      </p>
      <form onSubmit={submit}>
        <label htmlFor="request-slot">Available appointment</label>
        <select id="request-slot" name="slot_id" required defaultValue="">
          <option value="" disabled>
            Select a time
          </option>
          {slots.map((slot) => (
            <option key={slot.id} value={slot.id}>
              {slotTime(slot.starts_at, slot.ends_at)}
            </option>
          ))}
        </select>
        <p className="muted">Times are shown in your device&apos;s timezone.</p>
        <label>
          Describe the problem
          <textarea
            name="description"
            required
            minLength={10}
            maxLength={2000}
            rows={4}
            placeholder="Tell the technician what is happening and when it started."
          />
        </label>
        <label>
          Service address
          <input
            name="address"
            required
            minLength={5}
            maxLength={300}
            autoComplete="street-address"
            placeholder="Street address, city, state and postal code"
          />
        </label>
        <LocationMap points={points} onPick={pick} />
        <div className="field-pair">
          <label>
            Latitude
            <input
              type="number"
              step="any"
              min="-90"
              max="90"
              required
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          </label>
          <label>
            Longitude
            <input
              type="number"
              step="any"
              min="-180"
              max="180"
              required
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </label>
        </div>
        {validation && <p role="alert">{validation}</p>}
        <button disabled={busy || slots.length === 0}>
          {busy ? "Sending…" : "Send appointment request"}
        </button>
      </form>
    </section>
  );
}
