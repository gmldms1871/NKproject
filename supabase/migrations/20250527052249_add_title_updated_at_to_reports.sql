-- reports 테이블에 title과 updated_at 컬럼 추가
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 기존 보고서들에 기본 제목 설정
UPDATE public.reports 
SET title = '보고서 #' || substring(id::text, 1, 8)
WHERE title IS NULL;

-- title 컬럼을 필수(NOT NULL)로 설정
ALTER TABLE public.reports 
ALTER COLUMN title SET NOT NULL;

-- updated_at 자동 업데이트 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 보고서 수정 시 updated_at 자동 업데이트 트리거 생성
DROP TRIGGER IF EXISTS update_reports_updated_at ON public.reports;
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 기존 보고서들의 updated_at을 created_at으로 설정
UPDATE public.reports 
SET updated_at = created_at
WHERE updated_at IS NULL;