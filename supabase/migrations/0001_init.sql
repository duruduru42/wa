-- AI 오답노트 — Phase 1 schema
-- 단일 사용자 MVP. 멀티테넌시/RLS는 Phase 3에서 강화 (스펙 §9).
-- 테이블은 PDF화/통계가 가능하도록 forward-compatible 하게 둔다.

create extension if not exists "pgcrypto";

-- 오답노트 주체 (Phase 1: 기본 1명 시드)
create table if not exists students (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  grade      text,
  school     text,
  created_at timestamptz not null default now()
);

-- 오답노트(묶음)
create table if not exists notebooks (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  title      text not null,
  subject    text,
  unit       text,
  created_at timestamptz not null default now()
);

-- 단일 오답 항목 (스펙 §2 생명주기의 상태를 한 행에 보관)
create table if not exists wrong_items (
  id             uuid primary key default gen_random_uuid(),
  notebook_id    uuid references notebooks(id) on delete set null,
  student_id     uuid not null references students(id) on delete cascade,

  -- 입력 / Stage 1 추출
  source_image_url text,
  image_hash       text,                 -- 동일 이미지 중복 분석 방지 (스펙 §7-5)
  problem_latex    text,
  problem_text     text,
  student_answer   text,
  student_work     text,
  detected_subject text,
  detected_unit    text,
  extract_confidence real,

  -- Stage 2 정답/풀이
  correct_answer text,
  solution_steps jsonb default '[]'::jsonb,
  key_concepts   text[] default '{}',
  difficulty     int,                     -- 1..5

  -- Stage 3 검산
  verification_status text default 'pending'
    check (verification_status in ('pending','verified','mismatch','unverifiable')),
  verification_note   text,

  -- Stage 4 오답 원인
  error_explanation text,
  error_tags        text[] default '{}',  -- 고정 enum (lib/ai/schemas.ts ERROR_TAGS)
  tag_confidence    real,

  -- 메타
  subject        text,
  unit           text,
  source_textbook text,
  source_page     text,
  status         text not null default 'extracted'
    check (status in ('extracted','solved','analyzed','done','error')),
  model_version  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists wrong_items_student_idx on wrong_items(student_id);
create index if not exists wrong_items_notebook_idx on wrong_items(notebook_id);
create unique index if not exists wrong_items_image_hash_idx
  on wrong_items(student_id, image_hash) where image_hash is not null;

-- Stage 5 유사문제 (검산 통과분만 verified=true)
create table if not exists generated_problems (
  id             uuid primary key default gen_random_uuid(),
  wrong_item_id  uuid not null references wrong_items(id) on delete cascade,
  mode           text not null check (mode in ('A','B')),  -- A:숫자변형 B:접근법동일
  variant_latex  text not null,
  generated_answer text,
  generated_solution jsonb default '[]'::jsonb,
  difficulty     int,
  verified       boolean not null default false,
  verification_note text,
  model_version  text,
  created_at     timestamptz not null default now()
);

create index if not exists generated_problems_item_idx on generated_problems(wrong_item_id);

-- updated_at 자동 갱신
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists wrong_items_updated_at on wrong_items;
create trigger wrong_items_updated_at before update on wrong_items
  for each row execute function set_updated_at();
