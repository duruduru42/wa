-- Phase 1 시드: 단일 사용자용 기본 학생 + 기본 오답노트 + 이미지 버킷
-- 이 고정 UUID들을 앱이 DEFAULT_STUDENT_ID / DEFAULT_NOTEBOOK_ID 로 사용한다.

insert into students (id, name, grade, school)
values ('00000000-0000-0000-0000-000000000001', '기본 학생', '중3', null)
on conflict (id) do nothing;

insert into notebooks (id, student_id, title, subject)
values ('00000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000001',
        '기본 오답노트', '수학')
on conflict (id) do nothing;

-- 업로드 이미지 버킷 (로컬 개발용 public)
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;
