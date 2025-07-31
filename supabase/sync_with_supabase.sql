-- Supabase 동기화 SQL 스크립트
-- 이 스크립트는 현재 애플리케이션 상태와 완전히 동기화된 데이터베이스를 생성합니다.

-- 1. 기존 테이블 정리 (필요한 경우)
-- DROP TABLE IF EXISTS setup_edges CASCADE;
-- DROP TABLE IF EXISTS setup_blocks CASCADE;
-- DROP TABLE IF EXISTS setups CASCADE;
-- DROP TABLE IF EXISTS products CASCADE;
-- DROP TABLE IF EXISTS device_types CASCADE;
-- DROP TABLE IF EXISTS port_types CASCADE;

-- 2. 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. 기본 테이블 생성

-- 디바이스 타입 테이블
CREATE TABLE IF NOT EXISTS device_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- 포트 타입 테이블
CREATE TABLE IF NOT EXISTS port_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE
);

-- 제품 테이블
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  device_type_id INTEGER NOT NULL REFERENCES device_types(id),
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  image_url TEXT,
  is_builtin_display BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 설정 테이블
CREATE TABLE IF NOT EXISTS setups (
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

-- 설정 블록 테이블
CREATE TABLE IF NOT EXISTS setup_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setup_id UUID NOT NULL REFERENCES setups(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  custom_name VARCHAR(100),
  device_type_id INTEGER NOT NULL REFERENCES device_types(id),
  position_x DECIMAL NOT NULL,
  position_y DECIMAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 설정 엣지 테이블 (핸들 정보 없음 - 자동 계산)
CREATE TABLE IF NOT EXISTS setup_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setup_id UUID NOT NULL REFERENCES setups(id) ON DELETE CASCADE,
  source_block_id UUID NOT NULL REFERENCES setup_blocks(id) ON DELETE CASCADE,
  target_block_id UUID NOT NULL REFERENCES setup_blocks(id) ON DELETE CASCADE,
  source_port_type_id INTEGER NOT NULL REFERENCES port_types(id),
  target_port_type_id INTEGER NOT NULL REFERENCES port_types(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 기본 데이터 삽입

-- 디바이스 타입 데이터
INSERT INTO device_types (name) VALUES 
  ('computer'),
  ('monitor'),
  ('hub'),
  ('mouse'),
  ('keyboard')
ON CONFLICT (name) DO NOTHING;

-- 포트 타입 데이터
INSERT INTO port_types (code) VALUES 
  ('TYPE_C'),
  ('TYPE_B'),
  ('HDMI'),
  ('DP'),
  ('MINIDP')
ON CONFLICT (code) DO NOTHING;

-- 5. 인덱스 생성

-- 성능을 위한 인덱스들
CREATE INDEX IF NOT EXISTS idx_setups_created_at ON setups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_setups_deleted_at ON setups(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_setups_is_current ON setups(is_current);
CREATE INDEX IF NOT EXISTS idx_setup_blocks_setup_id ON setup_blocks(setup_id);
CREATE INDEX IF NOT EXISTS idx_setup_blocks_product_id ON setup_blocks(product_id);
CREATE INDEX IF NOT EXISTS idx_setup_blocks_device_type_id ON setup_blocks(device_type_id);
CREATE INDEX IF NOT EXISTS idx_setup_edges_setup_id ON setup_edges(setup_id);
CREATE INDEX IF NOT EXISTS idx_products_device_type_id ON products(device_type_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_model ON products(brand, model);

-- 6. 제약조건 추가

-- 설정당 컴퓨터는 하나만 허용
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_computer_per_setup 
ON setup_blocks (setup_id) 
WHERE device_type_id = (SELECT id FROM device_types WHERE name = 'computer');

-- 7. 뷰 생성

-- 설정 필터링을 위한 머티리얼라이즈드 뷰
CREATE MATERIALIZED VIEW IF NOT EXISTS setup_filters AS
SELECT 
  s.id as setup_id,
  ARRAY_AGG(DISTINCT sb.product_id) FILTER (WHERE sb.product_id IS NOT NULL) as product_ids
FROM setups s
JOIN setup_blocks sb ON s.id = sb.setup_id
WHERE s.deleted_at IS NULL
GROUP BY s.id;

-- GIN 인덱스 (배열 연산용)
CREATE INDEX IF NOT EXISTS idx_setup_filters_product_ids ON setup_filters USING GIN (product_ids);

-- 8. 함수 생성

-- 머티리얼라이즈드 뷰 새로고침 함수
CREATE OR REPLACE FUNCTION refresh_setup_filters()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW setup_filters;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. 트리거 생성

-- setup_blocks 변경 시 setup_filters 새로고침
DROP TRIGGER IF EXISTS trigger_refresh_setup_filters ON setup_blocks;
CREATE TRIGGER trigger_refresh_setup_filters
  AFTER INSERT OR UPDATE OR DELETE ON setup_blocks
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_setup_filters();

-- setups 업데이트 시 updated_at 자동 업데이트
DROP TRIGGER IF EXISTS trigger_setups_updated_at ON setups;
CREATE TRIGGER trigger_setups_updated_at
  BEFORE UPDATE ON setups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 10. Row Level Security 활성화
ALTER TABLE setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE port_types ENABLE ROW LEVEL SECURITY;

-- 11. RLS 정책 설정 (모든 사용자가 모든 데이터에 접근 가능하도록)
CREATE POLICY "Allow all operations on setups" ON setups FOR ALL USING (true);
CREATE POLICY "Allow all operations on setup_blocks" ON setup_blocks FOR ALL USING (true);
CREATE POLICY "Allow all operations on setup_edges" ON setup_edges FOR ALL USING (true);
CREATE POLICY "Allow all operations on products" ON products FOR ALL USING (true);
CREATE POLICY "Allow all operations on device_types" ON device_types FOR ALL USING (true);
CREATE POLICY "Allow all operations on port_types" ON port_types FOR ALL USING (true);

-- 12. 초기 데이터 새로고침
REFRESH MATERIALIZED VIEW setup_filters;

-- 완료 메시지
SELECT 'Supabase 동기화 완료!' as status; 