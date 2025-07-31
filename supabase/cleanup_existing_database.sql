-- 기존 Supabase 데이터베이스 정리 스크립트
-- 이 스크립트는 기존 데이터베이스에서 핸들 컬럼을 제거하고 정리합니다.

-- 1. 핸들 컬럼 제거 (기존 데이터베이스에 핸들 컬럼이 있는 경우)

-- 제약조건 제거
ALTER TABLE setup_edges 
DROP CONSTRAINT IF EXISTS chk_source_handle;

ALTER TABLE setup_edges 
DROP CONSTRAINT IF EXISTS chk_target_handle;

-- 인덱스 제거
DROP INDEX IF EXISTS idx_setup_edges_source_handle;
DROP INDEX IF EXISTS idx_setup_edges_target_handle;

-- 컬럼 제거
ALTER TABLE setup_edges 
DROP COLUMN IF EXISTS source_handle;

ALTER TABLE setup_edges 
DROP COLUMN IF EXISTS target_handle;

-- 2. 기본 데이터 확인 및 삽입

-- 디바이스 타입 데이터 (없는 경우에만 추가)
INSERT INTO device_types (name) VALUES 
  ('computer'),
  ('monitor'),
  ('hub'),
  ('mouse'),
  ('keyboard')
ON CONFLICT (name) DO NOTHING;

-- 포트 타입 데이터 (없는 경우에만 추가)
INSERT INTO port_types (code) VALUES 
  ('TYPE_C'),
  ('TYPE_B'),
  ('HDMI'),
  ('DP'),
  ('MINIDP')
ON CONFLICT (code) DO NOTHING;

-- 3. 인덱스 재생성 (필요한 경우)

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

-- 4. 제약조건 확인

-- 설정당 컴퓨터는 하나만 허용 (없는 경우에만 생성)
-- 먼저 computer 디바이스 타입의 ID를 찾아서 사용
DO $$
DECLARE
    computer_device_type_id INTEGER;
BEGIN
    SELECT id INTO computer_device_type_id FROM device_types WHERE name = 'computer';
    
    IF computer_device_type_id IS NOT NULL THEN
        EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS idx_one_computer_per_setup 
                       ON setup_blocks (setup_id) 
                       WHERE device_type_id = %s', computer_device_type_id);
    END IF;
END $$;

-- 5. 뷰 재생성

-- 기존 뷰 삭제 후 재생성
DROP MATERIALIZED VIEW IF EXISTS setup_filters;

CREATE MATERIALIZED VIEW setup_filters AS
SELECT 
  s.id as setup_id,
  ARRAY_AGG(DISTINCT sb.product_id) FILTER (WHERE sb.product_id IS NOT NULL) as product_ids
FROM setups s
JOIN setup_blocks sb ON s.id = sb.setup_id
WHERE s.deleted_at IS NULL
GROUP BY s.id;

-- GIN 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_setup_filters_product_ids ON setup_filters USING GIN (product_ids);

-- 6. 함수 재생성

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

-- 7. 트리거 재생성

-- 기존 트리거 제거 후 재생성
DROP TRIGGER IF EXISTS trigger_refresh_setup_filters ON setup_blocks;
CREATE TRIGGER trigger_refresh_setup_filters
  AFTER INSERT OR UPDATE OR DELETE ON setup_blocks
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_setup_filters();

DROP TRIGGER IF EXISTS trigger_setups_updated_at ON setups;
CREATE TRIGGER trigger_setups_updated_at
  BEFORE UPDATE ON setups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 8. Row Level Security 확인

-- RLS 활성화
ALTER TABLE setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE port_types ENABLE ROW LEVEL SECURITY;

-- 9. RLS 정책 재설정

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Allow all operations on setups" ON setups;
DROP POLICY IF EXISTS "Allow all operations on setup_blocks" ON setup_blocks;
DROP POLICY IF EXISTS "Allow all operations on setup_edges" ON setup_edges;
DROP POLICY IF EXISTS "Allow all operations on products" ON products;
DROP POLICY IF EXISTS "Allow all operations on device_types" ON device_types;
DROP POLICY IF EXISTS "Allow all operations on port_types" ON port_types;

-- 새 정책 생성
CREATE POLICY "Allow all operations on setups" ON setups FOR ALL USING (true);
CREATE POLICY "Allow all operations on setup_blocks" ON setup_blocks FOR ALL USING (true);
CREATE POLICY "Allow all operations on setup_edges" ON setup_edges FOR ALL USING (true);
CREATE POLICY "Allow all operations on products" ON products FOR ALL USING (true);
CREATE POLICY "Allow all operations on device_types" ON device_types FOR ALL USING (true);
CREATE POLICY "Allow all operations on port_types" ON port_types FOR ALL USING (true);

-- 10. 데이터 새로고침
REFRESH MATERIALIZED VIEW setup_filters;

-- 완료 메시지
SELECT '기존 데이터베이스 정리 완료!' as status; 