-- Change alternatives from uuid[] to jsonb to store similarity scores alongside IDs.
-- New format: [{"id": "uuid", "score": 0.85}, ...]
-- Existing rows are migrated: IDs preserved, scores set to null.

ALTER TABLE comparisons
  ADD COLUMN alternatives_v2 JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Migrate existing rows: convert uuid[] -> jsonb with null scores
UPDATE comparisons
SET alternatives_v2 = (
  SELECT jsonb_agg(jsonb_build_object('id', alt_id::text, 'score', null))
  FROM unnest(alternatives) AS alt_id
)
WHERE alternatives IS NOT NULL AND array_length(alternatives, 1) > 0;

-- Drop old column and rename new one
ALTER TABLE comparisons DROP COLUMN alternatives;
ALTER TABLE comparisons RENAME COLUMN alternatives_v2 TO alternatives;
