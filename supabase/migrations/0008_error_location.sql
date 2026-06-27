-- #2 풀이 단계별 오류 위치: 학생 풀이에서 '처음 어긋난 지점' + 올바른 형태
alter table wrong_items add column if not exists error_step text; -- 학생 풀이 중 틀린 부분(인용)
alter table wrong_items add column if not exists error_fix text;  -- 그 부분의 올바른 형태
