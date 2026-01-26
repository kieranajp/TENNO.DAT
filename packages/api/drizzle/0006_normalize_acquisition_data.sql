-- Normalize acquisitionData JSONB to relational tables

-- Crafting components for each item
CREATE TABLE item_components (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 1,
  ducats INTEGER,
  tradable BOOLEAN DEFAULT FALSE,
  UNIQUE(item_id, name)
);

-- Direct item drop locations
CREATE TABLE item_drops (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  location VARCHAR(255) NOT NULL,
  chance DECIMAL(10, 8) NOT NULL,
  rarity VARCHAR(20)
);

-- Component drop locations
CREATE TABLE component_drops (
  id SERIAL PRIMARY KEY,
  component_id INTEGER NOT NULL REFERENCES item_components(id) ON DELETE CASCADE,
  location VARCHAR(255) NOT NULL,
  chance DECIMAL(10, 8) NOT NULL,
  rarity VARCHAR(20)
);

-- Add introduced columns to items table
ALTER TABLE items ADD COLUMN introduced_name VARCHAR(255);
ALTER TABLE items ADD COLUMN introduced_date DATE;

-- Indexes for foreign keys
CREATE INDEX item_components_item_id_idx ON item_components(item_id);
CREATE INDEX item_drops_item_id_idx ON item_drops(item_id);
CREATE INDEX component_drops_component_id_idx ON component_drops(component_id);
