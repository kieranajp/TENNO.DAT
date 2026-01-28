-- Player wishlist table
CREATE TABLE IF NOT EXISTS "player_wishlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" varchar(50) NOT NULL,
	"item_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_wishlist_player_item_idx" ON "player_wishlist" USING btree ("player_id","item_id");--> statement-breakpoint
ALTER TABLE "player_wishlist" ADD CONSTRAINT "player_wishlist_unique" UNIQUE("player_id","item_id");--> statement-breakpoint
ALTER TABLE "player_wishlist" ADD CONSTRAINT "player_wishlist_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;
