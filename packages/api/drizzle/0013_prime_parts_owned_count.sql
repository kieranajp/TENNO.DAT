-- Convert owned boolean to owned_count integer for multi-quantity components
ALTER TABLE "player_prime_parts" ADD COLUMN "owned_count" integer NOT NULL DEFAULT 0;

-- Migrate existing data: owned=true becomes count matching the component's item_count
UPDATE "player_prime_parts" pp
SET "owned_count" = ic."item_count"
FROM "item_components" ic
WHERE pp."component_id" = ic."id"
AND pp."owned" = true;

ALTER TABLE "player_prime_parts" DROP COLUMN "owned";
