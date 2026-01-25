CREATE TABLE IF NOT EXISTS "player_loadout" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" varchar(50) NOT NULL,
	"warframe_id" integer,
	"primary_id" integer,
	"secondary_id" integer,
	"melee_id" integer,
	"focus_school" varchar(50),
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "player_loadout_player_id_unique" UNIQUE("player_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_loadout" ADD CONSTRAINT "player_loadout_warframe_id_items_id_fk" FOREIGN KEY ("warframe_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_loadout" ADD CONSTRAINT "player_loadout_primary_id_items_id_fk" FOREIGN KEY ("primary_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_loadout" ADD CONSTRAINT "player_loadout_secondary_id_items_id_fk" FOREIGN KEY ("secondary_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_loadout" ADD CONSTRAINT "player_loadout_melee_id_items_id_fk" FOREIGN KEY ("melee_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
