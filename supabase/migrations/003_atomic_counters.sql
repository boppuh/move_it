-- Atomic counter RPCs to avoid read-then-write race conditions

CREATE OR REPLACE FUNCTION increment_view_count(comparison_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE comparisons SET view_count = view_count + 1 WHERE id = comparison_id;
$$;

CREATE OR REPLACE FUNCTION increment_share_count(comparison_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE comparisons SET share_count = share_count + 1 WHERE id = comparison_id;
$$;
