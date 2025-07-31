-- setup_edges 테이블 완전 재생성 스크립트
-- 이 스크립트는 핸들 컬럼이 없는 새로운 setup_edges 테이블을 생성합니다.

-- 1. 기존 데이터 백업 (선택사항)
CREATE TABLE IF NOT EXISTS setup_edges_backup AS 
SELECT * FROM setup_edges;

-- 2. 기존 테이블 삭제
DROP TABLE IF EXISTS setup_edges CASCADE;

-- 3. 새로운 테이블 생성 (핸들 컬럼 없음)
CREATE TABLE setup_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setup_id UUID NOT NULL REFERENCES setups(id) ON DELETE CASCADE,
  source_block_id UUID NOT NULL REFERENCES setup_blocks(id) ON DELETE CASCADE,
  target_block_id UUID NOT NULL REFERENCES setup_blocks(id) ON DELETE CASCADE,
  source_port_type_id INTEGER NOT NULL REFERENCES port_types(id),
  target_port_type_id INTEGER NOT NULL REFERENCES port_types(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 인덱스 생성
CREATE INDEX idx_setup_edges_setup_id ON setup_edges(setup_id);

-- 5. 백업 데이터 복원 (핸들 컬럼 제외)
INSERT INTO setup_edges (
  id, 
  setup_id, 
  source_block_id, 
  target_block_id, 
  source_port_type_id, 
  target_port_type_id, 
  created_at
)
SELECT 
  id, 
  setup_id, 
  source_block_id, 
  target_block_id, 
  source_port_type_id, 
  target_port_type_id, 
  created_at
FROM setup_edges_backup;

-- 6. 백업 테이블 삭제 (선택사항)
-- DROP TABLE IF EXISTS setup_edges_backup;

-- 7. 새 테이블 구조 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'setup_edges' 
ORDER BY ordinal_position;

-- 8. 완료 메시지
SELECT 'setup_edges 테이블 재생성 완료!' as status; 