-- Migration: 20260426140000_wishlist
-- Phase 7. Buyer wishlist table + welcome_sent_at on user_profile.

-- ─── Wishlist table ──────────────────────────────────────────────────────────

CREATE TABLE wishlist (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  horse_id   UUID        NOT NULL REFERENCES horse(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, horse_id)
);

ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- Buyers can manage their own wishlist rows only.
CREATE POLICY wishlist_owner ON wishlist
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Maintain horse.wishlist_count ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_wishlist_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE horse SET wishlist_count = wishlist_count + 1 WHERE id = NEW.horse_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE horse SET wishlist_count = GREATEST(wishlist_count - 1, 0) WHERE id = OLD.horse_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER wishlist_count_trigger
  AFTER INSERT OR DELETE ON wishlist
  FOR EACH ROW EXECUTE FUNCTION update_wishlist_count();

-- ─── Track welcome email ─────────────────────────────────────────────────────

ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS welcome_sent_at TIMESTAMPTZ;
