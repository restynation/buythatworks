-- Complete database schema for Workswith application
-- This schema includes all tables, indexes, constraints, and functions needed for the application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create device_types table
CREATE TABLE device_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- Create port_types table
CREATE TABLE port_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE
);

-- Create products table
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  device_type_id INTEGER NOT NULL REFERENCES device_types(id),
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  image_url TEXT,
  is_builtin_display BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create setups table
CREATE TABLE setups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_current BOOLEAN NOT NULL,
  comment TEXT,
  image_url TEXT,
  daisy_chain BOOLEAN DEFAULT FALSE,
  builtin_display_usage BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- Create setup_blocks table
CREATE TABLE setup_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setup_id UUID NOT NULL REFERENCES setups(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  custom_name VARCHAR(100),
  device_type_id INTEGER NOT NULL REFERENCES device_types(id),
  position_x DECIMAL NOT NULL,
  position_y DECIMAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create setup_edges table (without handle columns since handles are calculated automatically)
CREATE TABLE setup_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setup_id UUID NOT NULL REFERENCES setups(id) ON DELETE CASCADE,
  source_block_id UUID NOT NULL REFERENCES setup_blocks(id) ON DELETE CASCADE,
  target_block_id UUID NOT NULL REFERENCES setup_blocks(id) ON DELETE CASCADE,
  source_port_type_id INTEGER NOT NULL REFERENCES port_types(id),
  target_port_type_id INTEGER NOT NULL REFERENCES port_types(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create setup_filters materialized view for fast filtering
CREATE MATERIALIZED VIEW setup_filters AS
SELECT 
  s.id as setup_id,
  ARRAY_AGG(DISTINCT sb.product_id) FILTER (WHERE sb.product_id IS NOT NULL) as product_ids
FROM setups s
JOIN setup_blocks sb ON s.id = sb.setup_id
WHERE s.deleted_at IS NULL
GROUP BY s.id;

-- Create indexes for performance
CREATE INDEX idx_setups_created_at ON setups(created_at DESC);
CREATE INDEX idx_setups_deleted_at ON setups(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_setups_is_current ON setups(is_current);
CREATE INDEX idx_setup_blocks_setup_id ON setup_blocks(setup_id);
CREATE INDEX idx_setup_blocks_product_id ON setup_blocks(product_id);
CREATE INDEX idx_setup_blocks_device_type_id ON setup_blocks(device_type_id);
CREATE INDEX idx_setup_edges_setup_id ON setup_edges(setup_id);
CREATE INDEX idx_products_device_type_id ON products(device_type_id);
CREATE INDEX idx_products_brand_model ON products(brand, model);

-- GIN index on materialized view for array operations
CREATE INDEX idx_setup_filters_product_ids ON setup_filters USING GIN (product_ids);

-- Partial unique index to ensure only one computer per setup
CREATE UNIQUE INDEX idx_one_computer_per_setup 
ON setup_blocks (setup_id) 
WHERE device_type_id = (SELECT id FROM device_types WHERE name = 'computer');

-- Enable Row Level Security
ALTER TABLE setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE port_types ENABLE ROW LEVEL SECURITY;

-- Add port types
INSERT INTO port_types (code) VALUES 
  ('HDMI'),
  ('DP'),
  ('Mini DP'),
  ('Type-C'),
  ('Type-C (Dongle)'),
  ('Type-A'),
  ('Type-A (Dongle)'),
  ('Wireless'),
  ('built-in')
ON CONFLICT (code) DO NOTHING;

-- RLS Policies for anonymous read access
CREATE POLICY "Allow anonymous read on setups" ON setups
  FOR SELECT TO anon
  USING (deleted_at IS NULL);

CREATE POLICY "Allow anonymous read on setup_blocks" ON setup_blocks
  FOR SELECT TO anon
  USING (setup_id IN (SELECT id FROM setups WHERE deleted_at IS NULL));

CREATE POLICY "Allow anonymous read on setup_edges" ON setup_edges
  FOR SELECT TO anon
  USING (setup_id IN (SELECT id FROM setups WHERE deleted_at IS NULL));

CREATE POLICY "Allow anonymous read on products" ON products
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anonymous read on device_types" ON device_types
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anonymous read on port_types" ON port_types
  FOR SELECT TO anon
  USING (true);

-- Allow anonymous insert on setups (handled by Edge Function for validation)
CREATE POLICY "Allow anonymous insert on setups" ON setups
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous insert on setup_blocks" ON setup_blocks
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous insert on setup_edges" ON setup_edges
  FOR INSERT TO anon
  WITH CHECK (true);

-- Create function to refresh setup_filters materialized view
CREATE OR REPLACE FUNCTION refresh_setup_filters()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW setup_filters;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically refresh setup_filters
CREATE TRIGGER trigger_refresh_setup_filters
  AFTER INSERT OR UPDATE OR DELETE ON setup_blocks
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_setup_filters();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_setups_updated_at
  BEFORE UPDATE ON setups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at(); 