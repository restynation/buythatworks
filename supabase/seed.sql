-- Insert device types
INSERT INTO device_types (name) VALUES
  ('computer'),
  ('monitor'),
  ('hub'),
  ('mouse'),
  ('keyboard');

-- Insert port types
INSERT INTO port_types (code) VALUES
  ('TYPE_C'),
  ('TYPE_A'),
  ('TYPE_A (Dongle)'),
  ('TYPE_C (Dongle)'),
  ('Wireless'),
  ('HDMI'),
  ('DP'),
  ('MINIDP');

-- Insert sample Mac products
INSERT INTO products (device_type_id, brand, model, image_url, is_builtin_display) VALUES
  -- Computers
  (1, 'Apple', 'MacBook Air M2 13"', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mba13-midnight-select-202402?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1708367688034', true),
  (1, 'Apple', 'MacBook Air M2 15"', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mba15-midnight-select-202306?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1684340179818', true),
  (1, 'Apple', 'MacBook Pro M3 14"', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mbp14-spacegray-select-202310?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1697311054290', true),
  (1, 'Apple', 'MacBook Pro M3 16"', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mbp16-spacegray-select-202310?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1697311055145', true),
  (1, 'Apple', 'Mac Studio M2 Max', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mac-studio-select-202306?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1684345161143', false),
  (1, 'Apple', 'Mac Studio M2 Ultra', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mac-studio-select-202306?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1684345161143', false),
  (1, 'Apple', 'Mac mini M2', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mac-mini-hero-202301?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1670038314708', false),
  (1, 'Apple', 'Mac mini M2 Pro', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mac-mini-hero-202301?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1670038314708', false),
  (1, 'Apple', 'Mac Pro M2 Ultra', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/mac-pro-hero-202306?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1683849425695', false),
  (1, 'Apple', 'iMac M3 24"', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/imac-24-blue-select-202310?wid=904&hei=840&fmt=jpeg&qlt=90&.v=1697311054070', true),

  -- Monitors
  (2, 'Apple', 'Studio Display 27"', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/studio-display-gallery-1-202203?wid=4000&hei=3072&fmt=jpeg&qlt=90&.v=1645719135334', false),
  (2, 'Apple', 'Pro Display XDR 32"', 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/pro-display-xdr-gallery-1-201912?wid=4000&hei=3072&fmt=jpeg&qlt=90&.v=1575918915104', false),
  (2, 'LG', 'UltraFine 5K 27"', null, false),
  (2, 'LG', 'UltraFine 4K 24"', null, false),
  (2, 'Samsung', 'M8 Smart Monitor 32"', null, false),
  (2, 'Samsung', 'Odyssey G9 49"', null, false),
  (2, 'Dell', 'UltraSharp U2723QE 27"', null, false),
  (2, 'Dell', 'UltraSharp U3223QE 32"', null, false),
  (2, 'BenQ', 'SW321C 32"', null, false),
  (2, 'ASUS', 'ProArt PA278QV 27"', null, false),

  -- Sample other devices for testing
  (3, 'CalDigit', 'TS4 Thunderbolt Station', null, false),
  (3, 'Anker', 'PowerExpand Elite 13-in-1', null, false),
  (3, 'Satechi', 'Aluminum Multi-Port Adapter V2', null, false),
  (4, 'Apple', 'Magic Mouse', null, false),
  (4, 'Logitech', 'MX Master 3S', null, false),
  (5, 'Apple', 'Magic Keyboard', null, false),
  (5, 'Keychron', 'K3 Wireless', null, false);

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW setup_filters; 