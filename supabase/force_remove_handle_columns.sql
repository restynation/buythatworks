-- 핸들 컬럼 강제 제거 스크립트
-- 이 스크립트는 setup_edges 테이블에서 핸들 컬럼을 완전히 제거합니다.

-- 1. 먼저 setup_edges 테이블의 현재 구조 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'setup_edges' 
ORDER BY ordinal_position;

-- 2. 핸들 컬럼이 존재하는지 확인
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'setup_edges' 
AND column_name IN ('source_handle', 'target_handle');

-- 3. 제약조건 제거 (존재하는 경우)
ALTER TABLE setup_edges 
DROP CONSTRAINT IF EXISTS chk_source_handle;

ALTER TABLE setup_edges 
DROP CONSTRAINT IF EXISTS chk_target_handle;

-- 4. 인덱스 제거 (존재하는 경우)
DROP INDEX IF EXISTS idx_setup_edges_source_handle;
DROP INDEX IF EXISTS idx_setup_edges_target_handle;

-- 5. 핸들 컬럼 강제 제거
ALTER TABLE setup_edges 
DROP COLUMN IF EXISTS source_handle;

ALTER TABLE setup_edges 
DROP COLUMN IF EXISTS target_handle;

-- 6. 제거 후 테이블 구조 다시 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'setup_edges' 
ORDER BY ordinal_position;

-- 7. 완료 메시지
SELECT '핸들 컬럼 제거 완료!' as status; 