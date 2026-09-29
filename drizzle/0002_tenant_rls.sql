-- Tenant isolation via row-level security.
--
-- Scope: the domain tables only. Better Auth owns users, sessions,
-- accounts and verifications and does its own token-scoped lookups, so a
-- policy there would break the library's own queries.
--
-- Identity comes from the app.user_id GUC, set with set_config(..., true)
-- inside the same transaction as the query (see db/index.ts forUser). It is
-- fail-closed: with the GUC unset, current_setting returns NULL, the
-- comparison is NULL, and the row is filtered out. A query that forgets to
-- scope itself reads nothing rather than everything.
--
-- Two things are load-bearing here, and both were found the hard way:
--
-- 1. FORCE ROW LEVEL SECURITY. A table owner bypasses RLS unless it is
--    forced, and migrations run as the owner, so without these lines the
--    policies would be inert for anyone who migrated.
--
-- 2. A NON-SUPERUSER, NOBYPASSRLS runtime role. A superuser ignores RLS
--    outright: not the owner bypass, not FORCE, nothing. The stock postgres
--    image creates POSTGRES_USER as a superuser, so pointing the app at it
--    silently disables every policy below. That is why the runtime connects
--    as reachsmith_app via APP_DATABASE_URL, and why getDb() asserts the
--    role cannot bypass RLS before handing out a connection.

-- Grants are granted to a role that does not exist yet in some environments,
-- so create it first. NOLOGIN on purpose: the password belongs in the
-- secret store, not in a migration. Operators grant LOGIN once, out of
-- band:  ALTER ROLE reachsmith_app LOGIN PASSWORD '<secret>'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'reachsmith_app') THEN
    CREATE ROLE reachsmith_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;
--> statement-breakpoint

GRANT USAGE ON SCHEMA public TO reachsmith_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO reachsmith_app;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO reachsmith_app;
--> statement-breakpoint
-- Default privileges cover tables added by later migrations, which would
-- otherwise be unreachable for the runtime role.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO reachsmith_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO reachsmith_app;
--> statement-breakpoint

ALTER TABLE "targets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "targets" FORCE ROW LEVEL SECURITY;
ALTER TABLE "templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "templates" FORCE ROW LEVEL SECURITY;
ALTER TABLE "audiences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audiences" FORCE ROW LEVEL SECURITY;
ALTER TABLE "outreaches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreaches" FORCE ROW LEVEL SECURITY;
ALTER TABLE "email_guesses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_guesses" FORCE ROW LEVEL SECURITY;

-- USING covers reads and the filter of updates/deletes; WITH CHECK covers the
-- rows an insert or update would write, so a scoped session cannot repoint a
-- row at another tenant by supplying a different user_id.
CREATE POLICY "tenant_isolation" ON "targets"
  USING (user_id = nullif(current_setting('app.user_id', true), ''))
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), ''));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "templates"
  USING (user_id = nullif(current_setting('app.user_id', true), ''))
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), ''));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "audiences"
  USING (user_id = nullif(current_setting('app.user_id', true), ''))
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), ''));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "outreaches"
  USING (user_id = nullif(current_setting('app.user_id', true), ''))
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), ''));
--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "email_guesses"
  USING (user_id = nullif(current_setting('app.user_id', true), ''))
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), ''));
