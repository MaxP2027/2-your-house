import { z } from "zod";

export const technicianSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string(),
  city: z.string(),
  bio: z.string(),
  services: z.string(),
  accepting_requests: z.boolean(),
});
export const slotSchema = z.object({
  id: z.string().uuid(),
  technician_id: z.string().uuid(),
  starts_at: z.string(),
  ends_at: z.string(),
});
export const serviceRequestSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  technician_id: z.string().uuid(),
  slot_id: z.string().uuid(),
  description: z.string(),
  status: z.enum(["pending", "accepted", "declined", "cancelled", "completed"]),
  approx_lat: z.number(),
  approx_lng: z.number(),
  starts_at: z.string(),
  ends_at: z.string(),
  customer_name: z.string(),
  technician_name: z.string(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
export const conversationSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  technician_id: z.string().uuid(),
  customer_name: z.string(),
  technician_name: z.string(),
});
export const messageSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  sender_id: z.string().uuid(),
  body: z.string(),
  created_at: z.string(),
});
export const marketplaceSnapshotSchema = z.object({
  role: z.enum(["customer", "technician"]),
  userId: z.string().uuid(),
  technicians: z.array(technicianSchema),
  slots: z.array(slotSchema),
  requests: z.array(serviceRequestSchema),
  conversations: z.array(conversationSchema),
  messages: z.array(messageSchema),
  ownTechnician: technicianSchema.nullable(),
});
export type Technician = z.infer<typeof technicianSchema>;
export type AvailabilitySlot = z.infer<typeof slotSchema>;
export type ServiceRequest = z.infer<typeof serviceRequestSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type Message = z.infer<typeof messageSchema>;
export type MarketplaceSnapshot = z.infer<typeof marketplaceSnapshotSchema>;
