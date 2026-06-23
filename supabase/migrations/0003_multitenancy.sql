-- Phase 3: 멀티테넌시 + RLS + 학원(B2B) 구조 (스펙 §1, §4, §7-6, §9 Phase3)
-- 원칙: 기존 단일 사용자 데이터는 기본 'individual' 테넌트로 백필해 무중단.
-- 서버 라우트는 service-role(RLS 우회)이라 기존 흐름은 그대로 동작.
-- RLS 정책은 auth 세션 클라이언트가 붙는 다음 단계에서 강제된다.

create table if not exists tenants (
  id   uuid primary key default gen_random_uuid(),
  type text not null default 'individual' check (type in ('individual','academy')),
  name text not null,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

-- 사용자↔테넌트↔역할 (user_id = auth.users.id; auth 연결 전엔 null 허용)
create table if not exists memberships (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  user_id      uuid,
  role         text not null check (role in ('admin','teacher','parent','student')),
  display_name text,
  created_at   timestamptz not null default now()
);
create index if not exists memberships_tenant_idx on memberships(tenant_id);
create index if not exists memberships_user_idx on memberships(user_id);

-- 반
create table if not exists classes (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name      text not null,
  created_at timestamptz not null default now()
);

-- 학부모↔학생 연결
create table if not exists parent_links (
  id                   uuid primary key default gen_random_uuid(),
  parent_membership_id uuid not null references memberships(id) on delete cascade,
  student_id           uuid not null references students(id) on delete cascade
);

-- 학생/노트/오답에 테넌트 범위 부여
alter table students    add column if not exists tenant_id uuid references tenants(id);
alter table students    add column if not exists class_id  uuid references classes(id);
alter table students    add column if not exists student_membership_id uuid references memberships(id);
alter table notebooks   add column if not exists tenant_id uuid references tenants(id);
alter table wrong_items add column if not exists tenant_id uuid references tenants(id);

-- 과제 출제
create table if not exists assignments (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  title      text not null,
  created_by uuid references memberships(id) on delete set null,
  due_at     timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists assignment_targets (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id    uuid not null references students(id) on delete cascade
);
create table if not exists assignment_problems (
  id                   uuid primary key default gen_random_uuid(),
  assignment_id        uuid not null references assignments(id) on delete cascade,
  generated_problem_id uuid not null references generated_problems(id) on delete cascade
);
create index if not exists assignment_targets_idx on assignment_targets(assignment_id);
create index if not exists assignment_problems_idx on assignment_problems(assignment_id);

-- 기본 individual 테넌트로 기존 데이터 백필
insert into tenants (id, type, name)
values ('00000000-0000-0000-0000-0000000000aa','individual','내 학습')
on conflict (id) do nothing;

update students    set tenant_id='00000000-0000-0000-0000-0000000000aa' where tenant_id is null;
update notebooks   set tenant_id='00000000-0000-0000-0000-0000000000aa' where tenant_id is null;
update wrong_items set tenant_id='00000000-0000-0000-0000-0000000000aa' where tenant_id is null;

-- 현재 로그인 사용자의 테넌트 id 목록 (RLS 헬퍼)
create or replace function auth_tenant_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select tenant_id from memberships where user_id = auth.uid()
$$;

-- 사용자의 특정 역할 보유 여부
create or replace function auth_has_role(p_tenant uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from memberships
    where user_id = auth.uid() and tenant_id = p_tenant and role = any(p_roles)
  )
$$;

-- RLS 활성화 (service-role 키는 우회하므로 기존 서버 라우트 영향 없음)
alter table tenants     enable row level security;
alter table memberships enable row level security;
alter table classes     enable row level security;
alter table students    enable row level security;
alter table notebooks   enable row level security;
alter table wrong_items enable row level security;
alter table generated_problems enable row level security;
alter table attempts    enable row level security;
alter table assignments enable row level security;

-- 정책: 자신이 속한 테넌트의 행만
drop policy if exists tenants_select on tenants;
create policy tenants_select on tenants for select
  using (id in (select auth_tenant_ids()));

drop policy if exists memberships_self on memberships;
create policy memberships_self on memberships for select
  using (tenant_id in (select auth_tenant_ids()));

drop policy if exists classes_tenant on classes;
create policy classes_tenant on classes for select
  using (tenant_id in (select auth_tenant_ids()));

-- 학생: 교사/관리자는 테넌트 전체, 학부모는 연결된 학생, 학생은 본인
drop policy if exists students_scope on students;
create policy students_scope on students for select using (
  auth_has_role(tenant_id, array['teacher','admin'])
  or student_membership_id in (select id from memberships where user_id = auth.uid())
  or id in (select student_id from parent_links pl
            join memberships m on m.id = pl.parent_membership_id
            where m.user_id = auth.uid())
);

-- 오답/노트/유사문제/시도: 같은 테넌트 + (교사/관리자 전체 or 본인 학생 범위)
drop policy if exists wrong_items_scope on wrong_items;
create policy wrong_items_scope on wrong_items for select using (
  tenant_id in (select auth_tenant_ids())
  and (
    auth_has_role(tenant_id, array['teacher','admin'])
    or student_id in (select id from students s where
        s.student_membership_id in (select id from memberships where user_id = auth.uid())
        or s.id in (select student_id from parent_links pl
                    join memberships m on m.id = pl.parent_membership_id
                    where m.user_id = auth.uid()))
  )
);

drop policy if exists notebooks_scope on notebooks;
create policy notebooks_scope on notebooks for select
  using (tenant_id in (select auth_tenant_ids()));

drop policy if exists generated_scope on generated_problems;
create policy generated_scope on generated_problems for select using (
  wrong_item_id in (select id from wrong_items)
);

drop policy if exists attempts_scope on attempts;
create policy attempts_scope on attempts for select using (
  student_id in (select id from students)
);

drop policy if exists assignments_scope on assignments;
create policy assignments_scope on assignments for select
  using (tenant_id in (select auth_tenant_ids()));
