-- 생각 유도(식 세우기) 모드 C — 풀게 하지 않고 조건 해석·식 세우기 사고를 단계별로
alter table generated_problems drop constraint if exists generated_problems_mode_check;
alter table generated_problems
  add constraint generated_problems_mode_check check (mode in ('A', 'B', 'C'));
alter table generated_problems
  add column if not exists thinking_steps jsonb default '[]'::jsonb;
