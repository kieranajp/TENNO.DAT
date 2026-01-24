CREATE TABLE IF NOT EXISTS "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"unique_name" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"is_prime" boolean DEFAULT false NOT NULL,
	"mastery_req" integer DEFAULT 0 NOT NULL,
	"max_rank" integer DEFAULT 30 NOT NULL,
	"image_name" varchar(255),
	"vaulted" boolean,
	CONSTRAINT "items_unique_name_unique" UNIQUE("unique_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "player_mastery" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" varchar(50) NOT NULL,
	"item_id" integer NOT NULL,
	"xp" integer NOT NULL,
	"is_mastered" boolean NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "player_item_unique" UNIQUE("player_id","item_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "player_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" varchar(50) NOT NULL,
	"platform" varchar(10) DEFAULT 'pc' NOT NULL,
	"display_name" varchar(100),
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "player_settings_player_id_unique" UNIQUE("player_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_mastery" ADD CONSTRAINT "player_mastery_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "category_idx" ON "items" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "is_prime_idx" ON "items" ("is_prime");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_item_idx" ON "player_mastery" ("player_id","item_id");