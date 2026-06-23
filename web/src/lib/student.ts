import "server-only";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRLSClient } from "@/lib/supabase/server";

// 로그인 사용자 → 본인 student 레코드 해석 (B2C per-user 스코핑).
// 학생 멤버십에 연결된 student가 있으면 그것을, 없으면 개인 테넌트+멤버십+student를 즉석 생성.
export interface MyStudent {
  studentId: string;
  notebookId: string | null;
  tenantId: string;
}

/** 서버 페이지용: 로그인 안 했으면 /login 으로 리다이렉트, 했으면 본인 student 해석. */
export async function requireMyStudent(): Promise<MyStudent & { user: User }> {
  const supa = await createRLSClient();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) redirect("/login");
  const me = await resolveStudentForUser(user);
  return { ...me, user };
}

export async function resolveStudentForUser(user: User): Promise<MyStudent> {
  const admin = createAdminClient();

  // 내 학생 멤버십에 연결된 student 찾기
  const { data: memberships } = await admin
    .from("memberships")
    .select("id, tenant_id")
    .eq("user_id", user.id)
    .eq("role", "student");
  const mids = (memberships ?? []).map((m) => m.id as string);

  let student: { id: string; tenant_id: string } | null = null;
  if (mids.length) {
    const { data } = await admin
      .from("students")
      .select("id, tenant_id")
      .in("student_membership_id", mids)
      .limit(1)
      .maybeSingle<{ id: string; tenant_id: string }>();
    student = data;
  }

  // 없으면 개인 학습용으로 즉석 프로비저닝
  if (!student) {
    const name = (user.email ?? "학생").split("@")[0];
    const { data: tenant, error: tErr } = await admin
      .from("tenants")
      .insert({ type: "individual", name: `${name}의 학습` })
      .select("id")
      .single();
    if (tErr || !tenant) throw new Error(`테넌트 생성 실패: ${tErr?.message}`);
    const { data: membership, error: mErr } = await admin
      .from("memberships")
      .insert({
        tenant_id: tenant.id,
        user_id: user.id,
        role: "student",
        display_name: name,
      })
      .select("id")
      .single();
    if (mErr || !membership) throw new Error(`멤버십 생성 실패: ${mErr?.message}`);
    const { data: created, error: sErr } = await admin
      .from("students")
      .insert({
        tenant_id: tenant.id,
        name,
        student_membership_id: membership.id,
      })
      .select("id, tenant_id")
      .single<{ id: string; tenant_id: string }>();
    if (sErr || !created) throw new Error(`학생 생성 실패: ${sErr?.message}`);
    student = created;
  }

  // 노트북 보장
  const { data: nb } = await admin
    .from("notebooks")
    .select("id")
    .eq("student_id", student.id)
    .limit(1)
    .maybeSingle<{ id: string }>();
  let notebookId = nb?.id ?? null;
  if (!notebookId) {
    const { data: createdNb } = await admin
      .from("notebooks")
      .insert({
        student_id: student.id,
        tenant_id: student.tenant_id,
        title: "내 오답노트",
      })
      .select("id")
      .single<{ id: string }>();
    notebookId = createdNb?.id ?? null;
  }

  return {
    studentId: student.id,
    notebookId,
    tenantId: student.tenant_id,
  };
}
