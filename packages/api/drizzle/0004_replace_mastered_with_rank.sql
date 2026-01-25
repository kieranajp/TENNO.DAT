-- Replace legacy is_mastered boolean with rank integer
-- This allows storing the exact item rank (0-40) instead of just mastered/not
ALTER TABLE "player_mastery" DROP COLUMN "is_mastered";--> statement-breakpoint
ALTER TABLE "player_mastery" ADD COLUMN "rank" integer DEFAULT 0 NOT NULL;
