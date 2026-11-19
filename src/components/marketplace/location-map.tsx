"use client";
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { MapPoint } from "./types";

export default function LocationMap({
  points = [],
  onPick,
}: {
  points?: MapPoint[];
  onPick?: (latitude: number, longitude: number) => void;
}) {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<mapboxgl.Map | null>(null);
  const onPickRef = useRef(onPick),
    markers = useRef<mapboxgl.Marker[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !container.current) return;
    let instance: mapboxgl.Map;
    try {
      instance = new mapboxgl.Map({
        container: container.current,
        accessToken: token,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-98, 39],
        zoom: 3,
      });
      map.current = instance;
      instance.addControl(new mapboxgl.NavigationControl(), "top-right");
      instance.on("click", (e) =>
        onPickRef.current?.(
          Number(e.lngLat.lat.toFixed(6)),
          Number(e.lngLat.lng.toFixed(6)),
        ),
      );
      instance.on("error", () =>
        setError(
          "The map could not load. Use the location fields or request list below.",
        ),
      );
    } catch {
      queueMicrotask(() =>
        setError(
          "This browser could not display the map. Use the location fields or request list below.",
        ),
      );
      return;
    }
    return () => {
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      instance.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!map.current) return;
    markers.current.forEach((marker) => marker.remove());
    const valid = points.filter(
      (p) =>
        Number.isFinite(p.latitude) &&
        Number.isFinite(p.longitude) &&
        Math.abs(p.latitude) <= 90 &&
        Math.abs(p.longitude) <= 180,
    );
    const bounds = new mapboxgl.LngLatBounds();
    markers.current = valid.map((p) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = p.approximate
        ? "request-marker approximate"
        : "request-marker";
      element.setAttribute(
        "aria-label",
        p.label +
          (p.approximate ? " — approximate area" : " — confirmed location"),
      );
      element.textContent = p.approximate ? "Area" : "Job";
      const marker = new mapboxgl.Marker({ element })
        .setLngLat([p.longitude, p.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setText(
            p.label + (p.approximate ? " (approximate area)" : ""),
          ),
        )
        .addTo(map.current!);
      bounds.extend([p.longitude, p.latitude]);
      return marker;
    });
    if (valid.length)
      map.current.fitBounds(bounds, {
        padding: 65,
        maxZoom: onPick ? 15 : 11,
        duration: 0,
      });
  }, [points, onPick]);
  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN)
    return (
      <div className="map-notice">
        <strong>Map preview is not configured yet.</strong>
        <p>
          You can still use the request list. For a new request, enter the
          latitude and longitude of the service location below.
        </p>
      </div>
    );
  return (
    <div>
      {error && (
        <p role="status" className="map-notice">
          {error}
        </p>
      )}
      <div
        ref={container}
        className="location-map"
        role="region"
        aria-label={
          onPick ? "Select service location on the map" : "Service requests map"
        }
      />
      <p className="muted">
        {onPick
          ? "Pan and zoom to your home, then select its position. You can also enter coordinates below."
          : "Area markers show approximate locations. Exact locations are shown only when access is authorized."}
      </p>
    </div>
  );
}
