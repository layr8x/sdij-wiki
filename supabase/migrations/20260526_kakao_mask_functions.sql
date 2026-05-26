-- 20260526_kakao_mask_functions.sql
-- 카카오 상담 데이터 PII 마스킹 SQL 함수 (핸드오프 2026-05-22 §6 재구축).
-- 용도: 레거시/일괄 데이터 재마스킹, 또는 뷰/쿼리에서의 서버측 마스킹.
-- 상시 적재 경로는 JS(scripts/lib/kakao-sanitize.mjs)에서 마스킹하므로, 이 함수는 보조 수단이다.
-- 주의: Postgres ARE 의 한글 단어경계(\m\M)는 동작하지 않으므로 경계 없이 매칭한다.

-- 이름 마스킹: 외자→*, 2자→앞+*, 3자+→앞+가운데(*)+뒤.
create or replace function public.mask_name_field(p text)
returns text
language sql
immutable
set search_path = pg_catalog, pg_temp
as $$
  select case
    when p is null then null
    when char_length(btrim(p)) = 0 then p
    when char_length(btrim(p)) = 1 then '*'
    when char_length(btrim(p)) = 2 then left(btrim(p), 1) || '*'
    else left(btrim(p), 1) || repeat('*', char_length(btrim(p)) - 2) || right(btrim(p), 1)
  end
$$;

-- 본문 마스킹: 카드/주민/이메일/휴대폰/유선/라벨이름. (라벨 뒤 이름은 [이름] 으로 치환)
create or replace function public.mask_text(p text)
returns text
language sql
immutable
set search_path = pg_catalog, pg_temp
as $$
  select case when p is null then null else
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
      p,
      '\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}', '[카드번호]', 'g'),
      '\d{6}[-\s]?[1-4]\d{6}', '[주민번호]', 'g'),
      '[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})', '***@\1', 'g'),
      '(01[016-9])[-.\s]?(\d{3,4})[-.\s]?(\d{4})', '\1-****-\3', 'g'),
      '(0\d{1,3})[-.\s](\d{3,4})[-.\s](\d{4})', '\1-****-\3', 'g'),
      '(회원명|가입자명|학생명|학생이름|학부모명|학부모이름|보호자명|자녀명|성함|이름)(\s*[:：]\s*)([가-힣]{1,4})', '\1\2[이름]', 'g')
  end
$$;

comment on function public.mask_name_field(text) is '이름 마스킹(외자/2자/3자+). kakao 상담 PII.';
comment on function public.mask_text(text) is '본문 PII 마스킹(카드/주민/이메일/전화/라벨이름). kakao 상담.';
