-- Migration: 20260425120200_distinct_sessions_rpc
-- Exposes a stable RPC for counting distinct sessions in the last 30 days.
-- Used by the lead-score recompute job.

CREATE OR REPLACE FUNCTION distinct_sessions_30d(p_user_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE AS $$
  SELECT COUNT(DISTINCT session_id)::int FROM view_event
   WHERE user_id = p_user_id AND occurred_at > now() - interval '30 days';
$$;
