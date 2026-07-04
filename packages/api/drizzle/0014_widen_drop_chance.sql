-- Widen drop `chance` columns from DECIMAL(10,8) (max < 100) to DECIMAL(12,8).
-- Guaranteed drops carry chance = 100 (100%), which overflows a (10,8) column and
-- kills the seed on a freshly-migrated database. Production is already (12,8) — this
-- brings the migrations back in line with reality so new/DR environments match.
ALTER TABLE item_drops ALTER COLUMN chance TYPE DECIMAL(12, 8);
--> statement-breakpoint
ALTER TABLE component_drops ALTER COLUMN chance TYPE DECIMAL(12, 8);
--> statement-breakpoint
ALTER TABLE resource_drops ALTER COLUMN chance TYPE DECIMAL(12, 8);
