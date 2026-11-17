export type Profile = {
  id: string;
  full_name: string;
  role: "customer" | "technician";
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Profile;
        Update: Partial<Profile>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      current_user_is_confirmed: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
