-- 복습 엔진: 틀린이유 한 문장 요약(#3) + 학생 메타인지 입력(#1)
alter table wrong_items add column if not exists error_summary text;       -- AI 한 문장 요약
alter table wrong_items add column if not exists student_reason text;       -- 학생이 적은 한 줄(주관식)
alter table wrong_items add column if not exists student_tags text[] default '{}'; -- 학생이 확인/수정한 원인 태그
alter table wrong_items add column if not exists reviewed_at timestamptz;    -- 복습 입력 시각
