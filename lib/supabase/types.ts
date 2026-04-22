/**
 * Supabase database type stub.
 * Replace with the generated output of `supabase gen types typescript` once
 * the schema migrations are stable.
 *
 * Only the tables used by the auth shell are declared here.
 * All other tables are accessed via the service client which accepts any type.
 */

export type UserRole = 'buyer' | 'syndicator' | 'operator';

export interface Database {
  public: {
    Tables: {
      user_profile: {
        Row: {
          id: string;
          role: UserRole;
          display_name: string | null;
          phone: string | null;
          state: string | null;
          postcode: string | null;
          owner_experience: string | null;
          budget_min_cents: number | null;
          budget_max_cents: number | null;
          preferred_sires: string[];
          preferred_trainers: string[];
          preferred_share_sizes: number[];
          preferred_states: string[];
          preferred_bonus_schemes: string[];
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          role?: UserRole;
          display_name?: string | null;
          phone?: string | null;
          state?: string | null;
          postcode?: string | null;
          owner_experience?: string | null;
          budget_min_cents?: number | null;
          budget_max_cents?: number | null;
          preferred_sires?: string[];
          preferred_trainers?: string[];
          preferred_share_sizes?: number[];
          preferred_states?: string[];
          preferred_bonus_schemes?: string[];
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          role?: UserRole;
          display_name?: string | null;
          phone?: string | null;
          state?: string | null;
          postcode?: string | null;
          owner_experience?: string | null;
          budget_min_cents?: number | null;
          budget_max_cents?: number | null;
          preferred_sires?: string[];
          preferred_trainers?: string[];
          preferred_share_sizes?: number[];
          preferred_states?: string[];
          preferred_bonus_schemes?: string[];
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
    };
  };
}
