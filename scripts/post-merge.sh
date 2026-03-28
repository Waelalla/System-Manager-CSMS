#!/bin/bash
set -e
pnpm install --frozen-lockfile

# Backfill products.code from category before applying unique index.
# For rows with duplicate categories, append the row id as suffix to ensure uniqueness.
# This is idempotent: only updates rows where code is empty or null.
if [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" <<'EOSQL' || echo "Note: products backfill skipped (table may not exist yet)"
DO $$
DECLARE
  rec RECORD;
  new_code TEXT;
BEGIN
  -- Only process rows where code is missing or empty
  FOR rec IN
    SELECT id, COALESCE(NULLIF(TRIM(category), ''), 'PROD-' || id::text) AS base_code
    FROM products
    WHERE code IS NULL OR code = ''
    ORDER BY id
  LOOP
    new_code := rec.base_code;
    -- If code already taken, append id as suffix
    IF EXISTS (SELECT 1 FROM products WHERE code = new_code AND id != rec.id) THEN
      new_code := rec.base_code || '-' || rec.id::text;
    END IF;
    UPDATE products SET code = new_code WHERE id = rec.id;
    RAISE NOTICE 'Set products.code = % for id=%', new_code, rec.id;
  END LOOP;
END $$;
EOSQL
fi

pnpm --filter db push-force
