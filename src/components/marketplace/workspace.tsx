"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  CalendarDays,
  MessageSquare,
  MapPin,
  Search,
  RefreshCw,
  ClipboardList,
  UserRound,
  Map as MapIcon,
  List,
} from "lucide-react";
import type {
  MarketplaceData,
  ServiceRequest,
  Technician,
  MapPoint,
} from "./types";
import { localDate, slotTime } from "./types";
import RequestForm from "./request-form";
import ProfileEditor from "./profile-editor";
const LocationMap = dynamic(() => import("./location-map"), {
  ssr: false,
  loading: () => <p className="muted">Loading map…</p>,
});
type View = "discover" | "requests" | "messages" | "day" | "profile";

export default function Workspace({
  role,
  fullName,
}: {
  role: "customer" | "technician";
  fullName: string;
}) {
  const [data, setData] = useState<MarketplaceData | null>(null),
    [loading, setLoading] = useState(true);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>(
      role === "technician" ? "day" : "discover",
    ),
    [city, setCity] = useState("");
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null),
    [activeChat, setActiveChat] = useState("");
  const [draft, setDraft] = useState(""),
    [day, setDay] = useState(() => localDate()),
    [mapView, setMapView] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"),
    [lastSynced, setLastSynced] = useState("");
  const [now, setNow] = useState(0);
  const mutationInFlight = useRef(false),
    loadSequence = useRef(0);
  const load = useCallback(async () => {
    const seq = ++loadSequence.current;
    try {
      const response = await fetch("/api/marketplace", { cache: "no-store" });
      const value = await response.json();
      if (response.status === 401 || response.status === 403) {
        if (seq === loadSequence.current) {
          setData(null);
          setDraft("");
          setSelectedTech(null);
          setActiveChat("");
          setNotice("");
          if (response.status === 401) window.location.replace("/login");
        }
        throw new Error(
          value.error || "Please log in again to access your workspace.",
        );
      }
      if (!response.ok)
        throw new Error(value.error || "Your workspace could not be loaded.");
      if (seq === loadSequence.current) {
        setData(value as MarketplaceData);
        setError("");
        setNow(Date.now());
        setLastSynced(
          new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
        );
      }
      return value as MarketplaceData;
    } catch (e) {
      if (seq === loadSequence.current)
        setError(
          e instanceof Error
            ? e.message
            : "Connection unavailable. Please try again.",
        );
      return null;
    } finally {
      if (seq === loadSequence.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
    const interval = setInterval(() => {
      if (!document.hidden && !mutationInFlight.current) void load();
    }, 5000);
    return () => clearInterval(interval);
  }, [load]);
  const mutate = useCallback(
    async (payload: Record<string, unknown>, success: string) => {
      if (mutationInFlight.current) return false;
      mutationInFlight.current = true;
      setBusy(true);
      setError("");
      setNotice("");
      try {
        const response = await fetch("/api/marketplace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const value = await response.json();
        if (!response.ok)
          throw new Error(value.error || "The change could not be saved.");
        setNotice(success);
        await load();
        return true;
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Connection unavailable. Your change was not confirmed. Please try again.",
        );
        return false;
      } finally {
        mutationInFlight.current = false;
        setBusy(false);
      }
    },
    [load],
  );
  const subscriberId = data?.userId;
  useEffect(() => {
    if (!subscriberId) return;
    const client = createSupabaseBrowserClient();
    if (!client) return;
    const channel = client
      .channel("workspace-" + subscriberId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [subscriberId, load]);
  const ownRequests = data?.requests ?? [];
  const todayRequests = ownRequests
    .filter(
      (r) =>
        localDate(new Date(r.starts_at)) === day &&
        ["pending", "accepted"].includes(r.status),
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const mapPoints = useMemo<MapPoint[]>(
    () =>
      (data?.requests ?? [])
        .filter(
          (r) =>
            localDate(new Date(r.starts_at)) === day &&
            ["pending", "accepted"].includes(r.status),
        )
        .map((r) => ({
          id: r.id,
          latitude: r.latitude ?? r.approx_lat,
          longitude: r.longitude ?? r.approx_lng,
          label:
            (role === "technician" ? r.customer_name : r.technician_name) +
            " · " +
            r.status,
          approximate: r.latitude == null || r.longitude == null,
        })),
    [data, day, role],
  );
  const nav =
    role === "technician"
      ? [
          { id: "day" as View, label: "My day", Icon: CalendarDays },
          { id: "requests" as View, label: "Requests", Icon: ClipboardList },
          { id: "messages" as View, label: "Messages", Icon: MessageSquare },
          {
            id: "profile" as View,
            label: "Profile & availability",
            Icon: UserRound,
          },
        ]
      : [
          { id: "discover" as View, label: "Find technicians", Icon: Search },
          { id: "requests" as View, label: "My requests", Icon: ClipboardList },
          { id: "messages" as View, label: "Messages", Icon: MessageSquare },
        ];
  function openChat(partnerId: string) {
    setActiveChat(partnerId);
    setDraft("");
    setView("messages");
    setSelectedTech(null);
  }
  async function startChat(tech: Technician) {
    if (
      await mutate(
        { action: "conversation", technician_id: tech.id },
        "Conversation ready.",
      )
    )
      openChat(tech.id);
  }
  const conversation =
    data?.conversations.find(
      (c) =>
        c.id === activeChat ||
        (role === "customer" ? c.technician_id : c.customer_id) === activeChat,
    ) ?? data?.conversations[0];
  const messages = conversation
    ? (data?.messages ?? [])
        .filter((m) => m.conversation_id === conversation.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    : [];
  const heading = {
    discover: "Find a technician",
    requests:
      role === "technician" ? "Incoming requests" : "Your service requests",
    messages: "Messages",
    day: "Your day",
    profile: "Profile & availability",
  }[view];
  return (
    <div className="workspace-body">
      <nav className="workspace-nav" aria-label="Workspace navigation">
        {nav.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={view === id ? "active" : ""}
            aria-pressed={view === id}
            onClick={() => {
              setView(id);
              setSelectedTech(null);
            }}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
      <main id="workspace-main" className="workspace-main">
        <div className="workspace-title">
          <div>
            <p className="eyebrow">
              {role === "technician"
                ? "Technician workspace"
                : "Homeowner workspace"}{" "}
              · {fullName}
            </p>
            <h1>{heading}</h1>
          </div>
          <button
            className="subtle refresh-button"
            disabled={busy}
            onClick={() => void load()}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
        </div>
        {error && (
          <div role="alert" className="work-alert">
            {error}{" "}
            <button className="subtle" onClick={() => void load()}>
              Retry
            </button>
          </div>
        )}
        {notice && (
          <p role="status" className="work-notice">
            {notice}
          </p>
        )}
        {loading ? (
          <div className="work-card empty" role="status">
            Loading your workspace…
          </div>
        ) : !data ? (
          <div className="work-card empty">
            <h2>Your workspace is temporarily unavailable.</h2>
            <p>
              Try refreshing. If your session has ended,{" "}
              <a href="/login">log in again</a>.
            </p>
          </div>
        ) : (
          <>
            {view === "discover" && (
              <>
                <p className="workspace-lead">
                  Browse independent technicians, start a conversation, and
                  request a time that works for you.
                </p>
                <label className="city-search">
                  <Search size={18} aria-hidden="true" />
                  <span className="sr-only">Filter technicians by city</span>
                  <input
                    placeholder="Search by service city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </label>
                {selectedTech ? (
                  <RequestForm
                    technician={selectedTech}
                    slots={data.slots.filter(
                      (s) => s.technician_id === selectedTech.id,
                    )}
                    mutate={mutate}
                    busy={busy}
                    onClose={() => setSelectedTech(null)}
                  />
                ) : (
                  <div className="technician-grid">
                    {data.technicians
                      .filter((t) =>
                        t.city
                          .toLowerCase()
                          .includes(city.trim().toLowerCase()),
                      )
                      .map((tech) => {
                        const slots = data.slots.filter(
                          (s) => s.technician_id === tech.id,
                        );
                        return (
                          <article
                            key={tech.id}
                            className="work-card technician-card"
                          >
                            <div
                              className="technician-avatar"
                              aria-hidden="true"
                            >
                              {tech.display_name.slice(0, 1).toUpperCase()}
                            </div>
                            <h2>{tech.display_name}</h2>
                            <p className="icon-line">
                              <MapPin size={16} aria-hidden="true" />
                              {tech.city}
                            </p>
                            <p className="service-label">{tech.services}</p>
                            <p className="bio">{tech.bio}</p>
                            <p className="availability-label">
                              {tech.accepting_requests
                                ? slots.length
                                  ? slots.length +
                                    " available " +
                                    (slots.length === 1 ? "slot" : "slots")
                                  : "No available slots yet"
                                : "Not accepting new requests"}
                            </p>
                            {slots[0] && tech.accepting_requests && (
                              <p className="muted">
                                Next:{" "}
                                {slotTime(slots[0].starts_at, slots[0].ends_at)}
                              </p>
                            )}
                            <div className="card-actions">
                              <button
                                disabled={
                                  busy ||
                                  !tech.accepting_requests ||
                                  !slots.length
                                }
                                onClick={() => setSelectedTech(tech)}
                              >
                                Request a visit
                              </button>
                              <button
                                className="subtle"
                                disabled={busy}
                                onClick={() => void startChat(tech)}
                              >
                                Message
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    {!data.technicians.some((t) =>
                      t.city.toLowerCase().includes(city.trim().toLowerCase()),
                    ) && (
                      <div className="work-card empty">
                        <h2>No technicians found.</h2>
                        <p>
                          {city
                            ? "Try another city or clear your search."
                            : "Technicians will appear here after publishing their profiles."}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {view === "requests" && (
              <>
                <div className="section-heading">
                  <p className="workspace-lead">
                    Track each visit from request to completion.
                  </p>
                  <label className="inline-label">
                    Status
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All requests</option>
                      {[
                        "pending",
                        "accepted",
                        "declined",
                        "cancelled",
                        "completed",
                      ].map((s) => (
                        <option key={s} value={s}>
                          {s[0].toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="request-list">
                  {ownRequests
                    .filter(
                      (r) =>
                        statusFilter === "all" || r.status === statusFilter,
                    )
                    .map((request) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        now={now}
                        role={role}
                        busy={busy}
                        mutate={mutate}
                        openChat={openChat}
                      />
                    ))}
                  {!ownRequests.some(
                    (r) => statusFilter === "all" || r.status === statusFilter,
                  ) && (
                    <div className="work-card empty">
                      <h2>No requests here yet.</h2>
                      <p>
                        {role === "customer"
                          ? "Find a technician and request an available appointment."
                          : "Publish your profile and available slots so customers can request a visit."}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
            {view === "day" && (
              <>
                <div className="day-banner">
                  <div>
                    <CalendarDays size={28} aria-hidden="true" />
                    <div>
                      <strong>
                        {
                          todayRequests.filter((r) => r.status === "accepted")
                            .length
                        }{" "}
                        {todayRequests.filter((r) => r.status === "accepted")
                          .length === 1
                          ? "confirmed visit"
                          : "confirmed visits"}
                      </strong>
                      <span>
                        {
                          todayRequests.filter((r) => r.status === "pending")
                            .length
                        }{" "}
                        awaiting your response
                      </span>
                    </div>
                  </div>
                  <label>
                    Choose a day
                    <input
                      type="date"
                      required
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                    />
                  </label>
                </div>
                <div className="section-heading">
                  <h2>Daily agenda</h2>
                  <div className="view-toggle" aria-label="Agenda view">
                    <button
                      className={!mapView ? "active" : "subtle"}
                      aria-pressed={!mapView}
                      onClick={() => setMapView(false)}
                    >
                      <List size={16} aria-hidden="true" />
                      List
                    </button>
                    <button
                      className={mapView ? "active" : "subtle"}
                      aria-pressed={mapView}
                      onClick={() => setMapView(true)}
                    >
                      <MapIcon size={16} aria-hidden="true" />
                      Map
                    </button>
                  </div>
                </div>
                {mapView && (
                  <div className="work-card">
                    <LocationMap points={mapPoints} />
                  </div>
                )}
                <p className="muted">
                  Appointments are shown in your device&apos;s timezone. Pending
                  requests show an approximate area until accepted.
                </p>
                <div className="request-list">
                  {todayRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      now={now}
                      role={role}
                      busy={busy}
                      mutate={mutate}
                      openChat={openChat}
                    />
                  ))}
                  {!todayRequests.length && (
                    <div className="work-card empty">
                      <h2>A clear day ahead.</h2>
                      <p>
                        No pending or confirmed appointments for this date.
                        Review other requests or publish more availability.
                      </p>
                      <button
                        className="subtle"
                        onClick={() => setView("profile")}
                      >
                        Manage availability
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            {view === "profile" && (
              <ProfileEditor
                profile={data.ownTechnician}
                fullName={fullName}
                slots={data.slots.filter(
                  (s) => s.technician_id === data.userId,
                )}
                mutate={mutate}
                busy={busy}
              />
            )}
            {view === "messages" && (
              <>
                <p className="workspace-lead">
                  Discuss the problem and appointment details privately.
                  Messages refresh every five seconds.
                </p>
                <div className="chat-layout">
                  <aside
                    className="work-card conversations"
                    aria-label="Conversations"
                  >
                    <h2>Conversations</h2>
                    {data.conversations.map((c) => (
                      <button
                        key={c.id}
                        className={
                          conversation?.id === c.id
                            ? "selected-conversation"
                            : "subtle"
                        }
                        aria-pressed={conversation?.id === c.id}
                        onClick={() => {
                          setActiveChat(c.id);
                          setDraft("");
                        }}
                      >
                        <MessageSquare size={18} aria-hidden="true" />
                        {role === "technician"
                          ? c.customer_name
                          : c.technician_name}
                      </button>
                    ))}
                    {!data.conversations.length && (
                      <p className="empty">
                        {role === "customer"
                          ? "Choose Message on a technician profile to begin."
                          : "Your customer conversations will appear here."}
                      </p>
                    )}
                  </aside>
                  <section
                    className="work-card chat-thread"
                    aria-label="Selected conversation"
                  >
                    {conversation ? (
                      <>
                        <h2>
                          {role === "technician"
                            ? conversation.customer_name
                            : conversation.technician_name}
                        </h2>
                        <div
                          className="message-history"
                          role="log"
                          aria-label="Message history"
                          aria-live="polite"
                        >
                          {messages.map((m) => (
                            <article
                              key={m.id}
                              className={
                                m.sender_id === data.userId
                                  ? "message own-message"
                                  : "message"
                              }
                            >
                              <span className="message-author">
                                {m.sender_id === data.userId
                                  ? "You"
                                  : role === "technician"
                                    ? conversation.customer_name
                                    : conversation.technician_name}
                              </span>
                              <p>{m.body}</p>
                              <time dateTime={m.created_at}>
                                {new Date(m.created_at).toLocaleString([], {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </time>
                            </article>
                          ))}
                          {!messages.length && (
                            <p className="empty">
                              Start with a short description of the problem.
                            </p>
                          )}
                        </div>
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (
                              await mutate(
                                {
                                  action: "message",
                                  conversation_id: conversation.id,
                                  body: draft,
                                },
                                "Message sent.",
                              )
                            )
                              setDraft("");
                          }}
                        >
                          <label>
                            Message
                            <textarea
                              required
                              maxLength={2000}
                              rows={3}
                              value={draft}
                              disabled={busy}
                              onChange={(e) => setDraft(e.target.value)}
                              placeholder="Write your message…"
                            />
                          </label>
                          <div className="section-heading">
                            <span className="muted">{draft.length}/2000</span>
                            <button disabled={busy || !draft.trim()}>
                              {busy ? "Sending…" : "Send message"}
                            </button>
                          </div>
                        </form>
                      </>
                    ) : (
                      <div className="empty">
                        <MessageSquare size={34} aria-hidden="true" />
                        <h2>Your conversations live here.</h2>
                        <p>Select a conversation to read and send messages.</p>
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}
            <p className="sync-note">
              Auto-refresh every 5 seconds
              {lastSynced ? " · Last updated " + lastSynced : ""} · All
              appointment times use your device&apos;s timezone.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
function RequestCard({
  request: r,
  now,
  role,
  busy,
  mutate,
  openChat,
}: {
  request: ServiceRequest;
  now: number;
  role: "customer" | "technician";
  busy: boolean;
  mutate: (
    payload: Record<string, unknown>,
    success: string,
  ) => Promise<boolean>;
  openChat: (partnerId: string) => void;
}) {
  const technician = role === "technician";
  return (
    <article className="work-card request-card">
      <div className="section-heading">
        <div>
          <p className="muted">{slotTime(r.starts_at, r.ends_at)}</p>
          <h3>{technician ? r.customer_name : r.technician_name}</h3>
        </div>
        <span className={"status-badge status-" + r.status}>{r.status}</span>
      </div>
      <p className="request-description">{r.description}</p>
      {r.address ? (
        <p className="icon-line">
          <MapPin size={17} aria-hidden="true" />
          {r.address}
        </p>
      ) : (
        <p className="muted">
          Exact address becomes available after acceptance.
        </p>
      )}
      {technician &&
        r.status === "accepted" &&
        new Date(r.starts_at).getTime() > now && (
          <p className="muted">
            You can mark this visit complete once the appointment starts.
          </p>
        )}
      <div className="card-actions">
        {technician && r.status === "pending" && (
          <>
            <button
              disabled={busy}
              onClick={() =>
                mutate(
                  {
                    action: "requestAction",
                    request_id: r.id,
                    status: "accepted",
                  },
                  "Appointment confirmed.",
                )
              }
            >
              Accept request
            </button>
            <button
              className="subtle"
              disabled={busy}
              onClick={() =>
                mutate(
                  {
                    action: "requestAction",
                    request_id: r.id,
                    status: "declined",
                  },
                  "Request declined. The slot is available again.",
                )
              }
            >
              Decline
            </button>
          </>
        )}
        {technician &&
          r.status === "accepted" &&
          new Date(r.starts_at).getTime() <= now && (
            <button
              disabled={busy}
              onClick={() =>
                mutate(
                  {
                    action: "requestAction",
                    request_id: r.id,
                    status: "completed",
                  },
                  "Visit marked complete.",
                )
              }
            >
              Mark complete
            </button>
          )}
        {((!technician && ["pending", "accepted"].includes(r.status)) ||
          (technician && r.status === "accepted")) && (
          <button
            className="subtle"
            disabled={busy}
            onClick={() =>
              mutate(
                {
                  action: "requestAction",
                  request_id: r.id,
                  status: "cancelled",
                },
                "Appointment cancelled.",
              )
            }
          >
            Cancel appointment
          </button>
        )}
        <button
          className="subtle"
          onClick={() => openChat(technician ? r.customer_id : r.technician_id)}
        >
          Open conversation
        </button>
      </div>
    </article>
  );
}
