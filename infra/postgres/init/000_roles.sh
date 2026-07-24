#!/bin/sh
set -eu
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=postgrest_password="${POSTGREST_DB_PASSWORD:-apextrade-postgrest-dev}" <<'SQL'
DO $$ BEGIN
  CREATE ROLE api_service NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE ROLE authenticator LOGIN NOINHERIT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER ROLE authenticator PASSWORD :'postgrest_password';
GRANT api_service TO authenticator;
SQL
