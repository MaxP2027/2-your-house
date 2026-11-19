export type Technician = {
  id: string;
  display_name: string;
  city: string;
  bio: string;
  services: string;
  accepting_requests: boolean;
};
export type Slot = {
  id: string;
  technician_id: string;
  starts_at: string;
  ends_at: string;
};
export type ServiceRequest = {
  id: string;
  customer_id: string;
  technician_id: string;
  slot_id: string;
  description: string;
  status: "pending" | "accepted" | "declined" | "cancelled" | "completed";
  approx_lat: number;
  approx_lng: number;
  starts_at: string;
  ends_at: string;
  customer_name: string;
  technician_name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
};
export type Conversation = {
  id: string;
  customer_id: string;
  technician_id: string;
  customer_name: string;
  technician_name: string;
};
export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
export type MarketplaceData = {
  role: "customer" | "technician";
  userId: string;
  technicians: Technician[];
  slots: Slot[];
  requests: ServiceRequest[];
  conversations: Conversation[];
  messages: Message[];
  ownTechnician: Technician | null;
};
export type Mutation = (
  payload: Record<string, unknown>,
  success: string,
) => Promise<boolean>;
export type MapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  approximate?: boolean;
};
export function slotTime(start: string, end: string) {
  const startDate = new Date(start),
    endDate = new Date(end);
  return (
    startDate.toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }) +
    " – " +
    endDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  );
}
export function localDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
