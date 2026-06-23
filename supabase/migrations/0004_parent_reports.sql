-- Phase 3: 학부모 리포트 (스펙 §6-7, §9 Phase3, §10 Solapi)
alter table memberships add column if not exists phone text;

create table if not exists parent_reports (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid references tenants(id) on delete cascade,
  student_id   uuid references students(id) on delete cascade,
  channel      text not null default 'sms' check (channel in ('sms','lms')),
  to_label     text,
  to_phone     text,
  body         text not null,
  status       text not null default 'sent' check (status in ('sent','failed','mock')),
  provider_ref text,
  created_at   timestamptz not null default now()
);
create index if not exists parent_reports_student_idx on parent_reports(student_id);

alter table parent_reports enable row level security;
drop policy if exists parent_reports_scope on parent_reports;
create policy parent_reports_scope on parent_reports for select
  using (tenant_id in (select auth_tenant_ids()));
