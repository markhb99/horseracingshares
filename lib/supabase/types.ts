/**
 * Supabase database type stub.
 * Replace with the generated output of `supabase gen types typescript` once
 * the schema migrations are stable.
 *
 * Declarations cover every table queried by the current app shell.
 * Extend as new tables are queried by server components / API routes.
 */

export type UserRole = 'buyer' | 'syndicator' | 'operator';
export type AfslStatus = 'unverified' | 'pending' | 'verified' | 'suspended' | 'expired';
export type HorseStatus = 'draft' | 'pending_review' | 'submitted' | 'active' | 'sold' | 'withdrawn';
export type EnquiryOutcome = 'pending' | 'contacted' | 'share_purchased' | 'rejected' | 'no_response';
export type SyndicatorTier = 'basic' | 'premium' | 'platinum' | 'partner';
export type SearchFrequency = 'off' | 'daily' | 'weekly';

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
          welcome_sent_at: string | null;
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
          welcome_sent_at?: string | null;
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
          welcome_sent_at?: string | null;
        };
        Relationships: [];
      };
      syndicator: {
        Row: {
          id: string;
          slug: string;
          name: string;
          abn: string | null;
          afsl_number: string | null;
          afsl_status: AfslStatus;
          afsl_verified_at: string | null;
          afsl_verified_by: string | null;
          afsl_expires_at: string | null;
          authorised_rep_of: string | null;
          tier: SyndicatorTier;
          contact_name: string;
          contact_email: string;
          contact_phone: string;
          website_url: string | null;
          logo_url: string | null;
          location_state: string | null;
          about: string | null;
          is_regal_owned: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['syndicator']['Row']> & {
          slug: string;
          name: string;
          contact_name: string;
          contact_email: string;
          contact_phone: string;
        };
        Update: Partial<Database['public']['Tables']['syndicator']['Row']>;
        Relationships: [];
      };
      trainer: {
        Row: {
          id: string;
          slug: string;
          name: string;
          stable_name: string | null;
          state: string | null;
          location: string | null;
          website_url: string | null;
          about: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['trainer']['Row']> & {
          slug: string;
          name: string;
        };
        Update: Partial<Database['public']['Tables']['trainer']['Row']>;
        Relationships: [];
      };
      syndicator_user: {
        Row: {
          syndicator_id: string;
          user_id: string;
          is_admin: boolean;
          invited_at: string;
          accepted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['syndicator_user']['Row']> & {
          syndicator_id: string;
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['syndicator_user']['Row']>;
        Relationships: [];
      };
      horse: {
        Row: {
          id: string;
          slug: string;
          syndicator_id: string;
          primary_trainer_id: string | null;
          status: HorseStatus;
          name: string | null;
          sire: string;
          dam: string;
          dam_sire: string | null;
          pedigree_json: Record<string, unknown> | null;
          foal_date: string | null;
          sex: string;
          colour: string | null;
          location_state: string;
          location_postcode: string | null;
          ongoing_cost_cents_per_pct_per_week: number | null;
          total_shares_available: number;
          total_shares_remaining: number;
          pds_url: string | null;
          pds_dated: string | null;
          vet_xray_clear: boolean | null;
          vet_scope_clear: boolean | null;
          vet_checked_at: string | null;
          description: string | null;
          bonus_schemes: string[];
          view_count: number;
          enquiry_count: number;
          wishlist_count: number;
          listing_tier_code: string | null;
          stripe_payment_id: string | null;
          submitted_at: string | null;
          approved_at: string | null;
          approved_by: string | null;
          rejection_reason: string | null;
          share_listings: Array<{ pct: number; price_cents: number; available: boolean }> | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['horse']['Row']> & {
          slug: string;
          syndicator_id: string;
          sire: string;
          dam: string;
          sex: string;
          location_state: string;
          total_shares_available: number;
          total_shares_remaining: number;
        };
        Update: Partial<Database['public']['Tables']['horse']['Row']>;
        Relationships: [];
      };
      enquiry: {
        Row: {
          id: string;
          user_id: string | null;
          horse_id: string;
          syndicator_id: string;
          contact_name: string;
          contact_email: string;
          contact_phone: string | null;
          message: string | null;
          share_size_interested_pct: number | null;
          budget_min_cents: number | null;
          budget_max_cents: number | null;
          preferred_contact_time: string | null;
          source: string | null;
          consent_marketing_at_submit: boolean;
          consent_share_at_submit: boolean;
          created_at: string;
          forwarded_to_syndicator_at: string | null;
          status: string;
          forward_failed_at: string | null;
          forward_error: string | null;
          outcome: EnquiryOutcome;
          outcome_updated_at: string | null;
          outcome_updated_by: string | null;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['enquiry']['Row']> & {
          horse_id: string;
          syndicator_id: string;
          contact_name: string;
          contact_email: string;
          consent_marketing_at_submit: boolean;
          consent_share_at_submit: boolean;
        };
        Update: Partial<Database['public']['Tables']['enquiry']['Row']>;
        Relationships: [];
      };
      saved_search: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          filter_json: Record<string, unknown>;
          frequency: SearchFrequency;
          last_sent_at: string | null;
          last_match_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          filter_json: Record<string, unknown>;
          frequency: SearchFrequency;
          last_sent_at?: string | null;
          last_match_count?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['saved_search']['Row']>;
        Relationships: [];
      };
      wishlist: {
        Row: {
          id: string;
          user_id: string;
          horse_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          horse_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['wishlist']['Row']>;
        Relationships: [];
      };
      saved_search_run: {
        Row: {
          id: string;
          user_id: string;
          saved_search_ids: string[];
          cadence: SearchFrequency;
          sent_email: boolean;
          email_message_id: string | null;
          match_count: number;
          ran_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          saved_search_ids: string[];
          cadence: SearchFrequency;
          sent_email?: boolean;
          email_message_id?: string | null;
          match_count: number;
          ran_at?: string;
        };
        Update: Partial<Database['public']['Tables']['saved_search_run']['Row']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      afsl_status: AfslStatus;
      horse_status: HorseStatus;
      enquiry_outcome: EnquiryOutcome;
      syndicator_tier: SyndicatorTier;
      search_frequency: SearchFrequency;
    };
  };
}
