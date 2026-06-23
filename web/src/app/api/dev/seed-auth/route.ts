import { NextResponse } from "next/server";
import { errMsg } from "@/lib/err";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// 개발용: 시드 멤버십에 연결된 auth 계정 생성 (스펙 §9 Phase3 데모 로그인).
// 운영에서는 정상 회원가입 플로우로 대체.
const ACADEMY = "00000000-0000-0000-0000-0000000000b0";
const PW = "password123";

export async function POST() {
  const supa = createAdminClient();
  try {
    // 멱등: email로 기존 유저 조회 후 없으면 생성
    const { data: list } = await supa.auth.admin.listUsers({ perPage: 200 });
    const byEmail = new Map(list.users.map((u) => [u.email ?? "", u.id]));

    async function ensureUser(email: string): Promise<string> {
      const existing = byEmail.get(email);
      if (existing) return existing;
      const { data, error } = await supa.auth.admin.createUser({
        email,
        password: PW,
        email_confirm: true,
      });
      if (error || !data.user) throw new Error(`${email}: ${error?.message}`);
      return data.user.id;
    }

    const teacherId = await ensureUser("teacher@wa.test");
    const parentId = await ensureUser("parent@wa.test");
    const studentId = await ensureUser("student@wa.test");

    // 교사 b1 / 학부모 b2 멤버십에 user_id 연결
    await supa
      .from("memberships")
      .update({ user_id: teacherId })
      .eq("id", "00000000-0000-0000-0000-0000000000b1");
    await supa
      .from("memberships")
      .update({ user_id: parentId })
      .eq("id", "00000000-0000-0000-0000-0000000000b2");

    // 학생 멤버십(d1=이수민) 보장 + students.student_membership_id 연결
    const studentMembershipId = "00000000-0000-0000-0000-0000000000b3";
    await supa.from("memberships").upsert(
      {
        id: studentMembershipId,
        tenant_id: ACADEMY,
        role: "student",
        display_name: "이수민",
        user_id: studentId,
      },
      { onConflict: "id" },
    );
    await supa
      .from("students")
      .update({ student_membership_id: studentMembershipId })
      .eq("id", "00000000-0000-0000-0000-0000000000d1");

    return NextResponse.json({
      ok: true,
      accounts: {
        teacher: "teacher@wa.test",
        parent: "parent@wa.test",
        student: "student@wa.test",
        password: PW,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}
