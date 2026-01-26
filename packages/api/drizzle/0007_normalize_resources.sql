-- Resources table (236+ from @wfcd/items)
CREATE TABLE resources (
  id SERIAL PRIMARY KEY,
  unique_name VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'Resource' | 'Gem' | 'Plant'
  image_name VARCHAR(255),
  description TEXT,
  tradable BOOLEAN DEFAULT FALSE
);

-- Junction table linking items to resources
CREATE TABLE item_resources (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  UNIQUE(item_id, resource_id)
);

-- Farm locations for resources
CREATE TABLE resource_drops (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  location VARCHAR(255) NOT NULL,
  chance DECIMAL(10, 8) NOT NULL,
  rarity VARCHAR(20),
  drop_quantity VARCHAR(50) -- e.g., "10X Plastids"
);

-- Indexes
CREATE INDEX resources_name_idx ON resources(name);
CREATE INDEX item_resources_item_id_idx ON item_resources(item_id);
CREATE INDEX item_resources_resource_id_idx ON item_resources(resource_id);
CREATE INDEX resource_drops_resource_id_idx ON resource_drops(resource_id);
