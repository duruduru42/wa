-- Phase 2: 유사문제 재채점 루프 (스펙 §4 attempts, §9 Phase2)
create table if not exists attempts (
  id                   uuid primary key default gen_random_uuid(),
  generated_problem_id uuid not null references generated_problems(id) on delete cascade,
  student_id           uuid not null references students(id) on delete cascade,
  submitted_answer     text,
  is_correct           boolean,
  grade_method         text,   -- 'sympy' | 'llm' | 'unknown'
  grade_note           text,
  created_at           timestamptz not null default now()
);

create index if not exists attempts_problem_idx on attempts(generated_problem_id);
create index if not exists attempts_student_idx on attempts(student_id);
