import { NextResponse } from "next/server";
import { errMsg } from "@/lib/err";
import { requireUser, authErrorResponse } from "@/lib/auth";
import { resolveStudentForUser } from "@/lib/student";
import { createAdminClient } from "@/lib/supabase/admin";
import { gradeAnswer } from "@/lib/ai/grade";
import type { GeneratedProblem } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

// POST /api/variants/[id]/attempt  { submitted_answer }
// 유사문제 재채점 루프 (스펙 §9 Phase2). sympy 우선 채점, 불가 시 LLM 폴백.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const supa = createAdminClient();
  try {
    const user = await requireUser();
    const me = await resolveStudentForUser(user);
    const { submitted_answer } = (await req.json()) as {
      submitted_answer: string;
    };
    if (!submitted_answer?.trim()) {
      return NextResponse.json({ error: "submitted_answer 필요" }, { status: 400 });
    }

    const { data: gp, error } = await supa
      .from("generated_problems")
      .select("id, variant_latex, generated_answer, wrong_items!inner(student_id)")
      .eq("id", id)
      .maybeSingle<
        Pick<GeneratedProblem, "id" | "variant_latex" | "generated_answer"> & {
          wrong_items: { student_id: string } | { student_id: string }[];
        }
      >();
    if (error) throw error;
    if (!gp) return NextResponse.json({ error: "not found" }, { status: 404 });
    const owner = Array.isArray(gp.wrong_items)
      ? gp.wrong_items[0]?.student_id
      : gp.wrong_items?.student_id;
    if (owner !== me.studentId)
      return NextResponse.json({ error: "권한 없음 (본인 문제가 아님)" }, { status: 403 });
    if (!gp.generated_answer) {
      return NextResponse.json(
        { error: "이 유사문제에 정답 데이터가 없어 채점 불가" },
        { status: 400 },
      );
    }

    const grade = await gradeAnswer({
      problem_latex: gp.variant_latex,
      expected_answer: gp.generated_answer,
      submitted_answer,
    });

    const { data: attempt, error: insErr } = await supa
      .from("attempts")
      .insert({
        generated_problem_id: id,
        student_id: me.studentId,
        submitted_answer,
        is_correct: grade.is_correct,
        grade_method: grade.method,
        grade_note: grade.note,
      })
      .select("*")
      .single();
    if (insErr) throw insErr;

    return NextResponse.json({ ...grade, attempt });
  } catch (e) {
    const a = authErrorResponse(e);
    if (a) return NextResponse.json({ error: a.error }, { status: a.status });
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}
