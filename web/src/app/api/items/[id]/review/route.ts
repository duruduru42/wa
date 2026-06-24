import { NextResponse } from "next/server";
import { errMsg } from "@/lib/err";
import { requireUser, authErrorResponse } from "@/lib/auth";
import { resolveStudentForUser } from "@/lib/student";
import { createAdminClient } from "@/lib/supabase/admin";
import { ERROR_TAGS } from "@/lib/ai/schemas";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/items/[id]/review  { student_reason?, student_tags?[] }
// 학생 메타인지 입력(틀린 이유 확인/주관식) 저장 — 복습 엔진(#1).
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const supa = createAdminClient();
  try {
    const user = await requireUser();
    const me = await resolveStudentForUser(user);

    const body = (await req.json()) as {
      student_reason?: string;
      student_tags?: string[];
    };
    const tags = (body.student_tags ?? []).filter((t) =>
      (ERROR_TAGS as readonly string[]).includes(t),
    );

    const { data, error } = await supa
      .from("wrong_items")
      .update({
        student_reason: body.student_reason?.trim() || null,
        student_tags: tags,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("student_id", me.studentId) // 본인 것만
      .select("id, student_reason, student_tags, reviewed_at")
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return NextResponse.json({ error: "본인 오답이 아님" }, { status: 403 });
    return NextResponse.json(data);
  } catch (e) {
    const a = authErrorResponse(e);
    if (a) return NextResponse.json({ error: a.error }, { status: a.status });
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}
