-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "steam_id" VARCHAR(20) NOT NULL UNIQUE,
  "steam_display_name" VARCHAR(100),
  "steam_avatar_url" VARCHAR(255),
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "last_login_at" TIMESTAMP
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" VARCHAR(64) PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "remember_me" BOOLEAN DEFAULT FALSE NOT NULL,
  "expires_at" TIMESTAMP NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions"("expires_at");

-- Add user_id to player_settings (NOT NULL since we assume empty table for fresh migration)
ALTER TABLE "player_settings" ADD COLUMN "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "player_settings" ALTER COLUMN "player_id" DROP NOT NULL;

-- Drop the old unique constraint on player_id
ALTER TABLE "player_settings" DROP CONSTRAINT IF EXISTS "player_settings_player_id_unique";

-- Add unique constraint on user_id (one settings row per user)
ALTER TABLE "player_settings" ADD CONSTRAINT "player_settings_user_id_unique" UNIQUE("user_id");
