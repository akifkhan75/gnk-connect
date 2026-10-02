-- Backfill seeded chart codes to 7 digits (1100 → 1100000).
-- Also remaps short-lived 6-digit auto codes (110001 → 1100001) and partner
-- receivables that were prefixed with the old 4-digit AR control code.

UPDATE "LedgerAccount"
   SET "code" = 'tmp:' || "code",
       "updatedAt" = CURRENT_TIMESTAMP
 WHERE "code" ~ '^\d{4}$'
    OR "code" ~ '^\d{6}$'
    OR "code" ~ '^\d{4}-';

UPDATE "LedgerAccount" la
   SET "code" = CASE
         WHEN s.old ~ '^\d{4}$' THEN rpad(s.old, 7, '0')
         WHEN s.old ~ '^\d{6}$' THEN left(s.old, 4) || '0' || right(s.old, 2)
         WHEN s.old ~ '^\d{4}-' THEN rpad(split_part(s.old, '-', 1), 7, '0')
              || substr(s.old, length(split_part(s.old, '-', 1)) + 1)
         ELSE s.old
       END,
       "updatedAt" = CURRENT_TIMESTAMP
  FROM (
    SELECT id, substr("code", 5) AS old
      FROM "LedgerAccount"
     WHERE "code" LIKE 'tmp:%'
  ) s
 WHERE la.id = s.id;
