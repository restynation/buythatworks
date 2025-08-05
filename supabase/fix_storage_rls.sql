-- Storage RLS 정책 수정
-- setup-images 버킷에 대한 RLS 정책 추가

-- Storage 버킷에 대한 RLS 활성화
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- setup-images 버킷에 대한 정책 추가
-- 익명 사용자도 읽기/쓰기 가능하도록 설정
CREATE POLICY "Allow anonymous access to setup-images" ON storage.objects
  FOR ALL USING (bucket_id = 'setup-images');

-- 또는 더 구체적인 정책들
-- 읽기 정책
CREATE POLICY "Allow anonymous read on setup-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'setup-images');

-- 쓰기 정책  
CREATE POLICY "Allow anonymous insert on setup-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'setup-images');

-- 업데이트 정책
CREATE POLICY "Allow anonymous update on setup-images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'setup-images');

-- 삭제 정책
CREATE POLICY "Allow anonymous delete on setup-images" ON storage.objects
  FOR DELETE USING (bucket_id = 'setup-images'); 