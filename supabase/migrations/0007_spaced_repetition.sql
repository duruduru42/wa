-- 간격반복(SM-2) 복습 스케줄 — 틀린 이유를 며칠 뒤 가린 채 재인출(스펙 §10)
alter table wrong_items add column if not exists review_due_at timestamptz;
alter table wrong_items add column if not exists review_interval int not null default 0;   -- 일
alter table wrong_items add column if not exists review_ease real not null default 2.5;     -- 용이도
alter table wrong_items add column if not exists review_reps int not null default 0;        -- 연속 성공
create index if not exists wrong_items_review_due_idx on wrong_items(student_id, review_due_at);
