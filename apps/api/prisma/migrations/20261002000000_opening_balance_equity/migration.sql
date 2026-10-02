-- Counterpart account for chart-of-accounts opening-balance journals.
INSERT INTO "LedgerAccount" ("id", "code", "name", "class", "isGroup", "systemKey", "currency", "parentId", "updatedAt")
SELECT gen_random_uuid(),
       '3400',
       'Opening Balance Equity',
       'EQUITY',
       false,
       'OPENING_BALANCE',
       'PKR',
       p."id",
       CURRENT_TIMESTAMP
  FROM "LedgerAccount" p
 WHERE p."code" = '3000'
   AND NOT EXISTS (SELECT 1 FROM "LedgerAccount" WHERE "code" = '3400' OR "systemKey" = 'OPENING_BALANCE');

UPDATE "LedgerAccount"
   SET "systemKey" = 'OPENING_BALANCE',
       "name" = 'Opening Balance Equity',
       "class" = 'EQUITY',
       "isGroup" = false
 WHERE "code" = '3400' AND ("systemKey" IS NULL OR "systemKey" = 'OPENING_BALANCE');
