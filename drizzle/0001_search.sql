-- Accent- and case-insensitive, typo-tolerant search (spec: "Search").
-- The default unaccent rules strip Greek tonos/dialytika (ά→α, ΐ→ι), so
-- f_unaccent(lower('Κατσαβίδι')) = 'κατσαβιδι'.
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
-- unaccent() is only STABLE (it depends on the dictionary search path); an IMMUTABLE
-- wrapper with the dictionary pinned is required to use it in an index expression.
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS items_name_trgm_idx ON items USING gin (f_unaccent(lower(name)) gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS areas_name_trgm_idx ON areas USING gin (f_unaccent(lower(name)) gin_trgm_ops);
