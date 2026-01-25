CREATE TABLE IF NOT EXISTS "nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"node_key" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"planet" varchar(50) NOT NULL,
	"node_type" varchar(20) NOT NULL,
	"mastery_xp" integer NOT NULL,
	CONSTRAINT "nodes_node_key_unique" UNIQUE("node_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "player_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" varchar(50) NOT NULL,
	"node_id" integer NOT NULL,
	"completes" integer DEFAULT 0 NOT NULL,
	"is_steel_path" boolean DEFAULT false NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "player_nodes_player_id_node_id_is_steel_path_unique" UNIQUE("player_id","node_id","is_steel_path")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_nodes" ADD CONSTRAINT "player_nodes_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
