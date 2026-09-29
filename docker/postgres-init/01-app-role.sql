-- Local dev only. The stock postgres image creates POSTGRES_USER as a
-- superuser, and a superuser ignores row-level security entirely: not the
-- owner bypass, not FORCE, nothing. The app therefore needs a second,
-- ordinary role to connect as, and that is the role the tenant policies
-- actually constrain.
--
-- The production equivalent is created by drizzle/0002_tenant_rls.sql; this
-- file only adds LOGIN and a throwaway password, which does not belong in a
-- migration.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'reachsmith_app') THEN
    CREATE ROLE reachsmith_app LOGIN PASSWORD 'reachsmith_app'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;
