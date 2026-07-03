-- API key scopes + unique prefix (T-2.4).
-- `scopes` carries the key's capability scope (enforced once the Policy Engine
-- lands in T-2.5); `prefix` is the non-secret lookup id and must be unique so a
-- presented key can be located before hash verification.

ALTER TABLE "api_keys" ADD COLUMN "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE UNIQUE INDEX "api_keys_prefix_key" ON "api_keys"("prefix");
