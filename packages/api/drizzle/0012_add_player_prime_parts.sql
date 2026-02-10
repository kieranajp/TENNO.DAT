CREATE TABLE IF NOT EXISTS "player_prime_parts" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" varchar(50) NOT NULL,
	"component_id" integer NOT NULL,
	"owned" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "player_prime_parts_unique" UNIQUE("player_id","component_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_prime_parts" ADD CONSTRAINT "player_prime_parts_component_id_item_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "item_components"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_prime_parts_player_component_idx" ON "player_prime_parts" ("player_id","component_id");
