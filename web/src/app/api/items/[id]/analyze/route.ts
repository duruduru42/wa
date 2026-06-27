import { NextResponse } from "next/server";
import { errMsg } from "@/lib/err";
import { requireUser, authErrorResponse } from "@/lib/auth";
import { resolveStudentForUser } from "@/lib/student";
import { createAdminClient } from "@/lib/supabase/admin";
import { runStage2Solve } from "@/lib/ai/stage2-solve";
import { runStage3Verify } from "@/lib/ai/stage3-verify";
import { runStage4Analyze } from "@/lib/ai/stage4-analyze";
import { MODEL_VERSION_TAG } from "@/lib/constants";
import type { WrongItem } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

// POST /api/items/[id]/analyze
// 확정된 문제로 Stage 2(풀이) → 3(검산) → 4(원인분석)을 실행.
// 사용자가 교정 후 재실행 가능 (스테이지 독립 재실행).
export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const supa = createAdminClient();
  let myStudentId: string;
  try {
    const user = await requireUser();
    myStudentId = (await resolveStudentForUser(user)).studentId;
  } catch (e) {
    const a = authErrorResponse(e);
    if (a) return NextResponse.json({ error: a.error }, { status: a.status });
    throw e;
  }
  try {
    const { data: item, error } = await supa
      .from("wrong_items")
      .select("*")
      .eq("id", id)
      .maybeSingle<WrongItem>();
    if (error) throw error;
    if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (item.student_id !== myStudentId)
      return NextResponse.json({ error: "권한 없음 (본인 오답이 아님)" }, { status: 403 });
    if (!item.problem_latex) {
      return NextResponse.json(
        { error: "problem_latex 가 비어있음 — 먼저 추출/교정 필요" },
        { status: 400 },
      );
    }

    // Stage 2(풀이) → Stage 3(검산). 불일치면 오류 대신 1회 재생성 재시도.
    const started = Date.now();
    let s2 = await runStage2Solve({
      problem_latex: item.problem_latex,
      problem_text: item.problem_text,
    });
    let s3 = await runStage3Verify({
      problem_latex: item.problem_latex,
      problem_plaintext: item.problem_text,
      stage2: s2,
    });
    // 불일치면 1회 재시도 — 단 남은 시간 예산(서버리스 제한)이 충분할 때만.
    if (s3.verification_status === "mismatch" && Date.now() - started < 45000) {
      const r2 = await runStage2Solve({
        problem_latex: item.problem_latex,
        problem_text: item.problem_text,
      });
      const r3 = await runStage3Verify({
        problem_latex: item.problem_latex,
        problem_plaintext: item.problem_text,
        stage2: r2,
      });
      // 더 나은 결과(불일치 아님)면 채택
      if (r3.verification_status !== "mismatch") {
        s2 = r2;
        s3 = r3;
      }
    }

    // Stage 4: 오답 원인 + 태깅
    const s4 = await runStage4Analyze({
      problem_latex: item.problem_latex,
      student_answer: item.student_answer,
      student_work: item.student_work,
      stage2: s2,
    });

    const { data: updated, error: upErr } = await supa
      .from("wrong_items")
      .update({
        correct_answer: s2.correct_answer,
        solution_steps: s2.solution_steps,
        key_concepts: s2.key_concepts,
        difficulty: s2.difficulty,
        verification_status: s3.verification_status,
        verification_note: s3.verification_note,
        error_summary: s4.error_summary,
        error_explanation: s4.error_explanation,
        error_step: s4.error_step || null,
        error_fix: s4.error_fix || null,
        error_tags: s4.error_tags,
        tag_confidence: s4.tag_confidence,
        status: "analyzed",
        model_version: MODEL_VERSION_TAG,
        // 복습 스케줄 진입: 내일부터 복습 대상(SM-2)
        review_due_at: new Date(Date.now() + 86400000).toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (upErr) throw upErr;

    return NextResponse.json(updated);
  } catch (e) {
    await supa.from("wrong_items").update({ status: "error" }).eq("id", id);
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}
