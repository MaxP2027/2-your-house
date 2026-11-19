export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
export type Profile = {
  id: string;
  full_name: string;
  role: "customer" | "technician";
  created_at: string;
};
type Table<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};
export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Profile>;
      technician_profiles: Table<{
        id: string;
        display_name: string;
        city: string;
        bio: string;
        services: string;
        accepting_requests: boolean;
      }>;
      availability_slots: Table<{
        id: string;
        technician_id: string;
        starts_at: string;
        ends_at: string;
        active: boolean;
      }>;
      service_requests: Table<{
        id: string;
        customer_id: string;
        technician_id: string;
        slot_id: string;
        description: string;
        status: "pending" | "accepted" | "declined" | "cancelled" | "completed";
        approx_lat: number;
        approx_lng: number;
        created_at: string;
        updated_at: string;
      }>;
      request_locations: Table<{
        request_id: string;
        address: string;
        latitude: number;
        longitude: number;
      }>;
      conversations: Table<{
        id: string;
        customer_id: string;
        technician_id: string;
        created_at: string;
      }>;
      messages: Table<{
        id: string;
        conversation_id: string;
        sender_id: string;
        body: string;
        created_at: string;
      }>;
    };
    Views: { [_ in never]: never };
    Functions: {
      current_user_is_confirmed: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      marketplace_actor: { Args: Record<string, never>; Returns: Profile };
      marketplace_snapshot: { Args: Record<string, never>; Returns: Json };
      marketplace_mutate: { Args: { payload: Json }; Returns: Json };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
