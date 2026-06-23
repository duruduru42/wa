import { NextResponse } from "next/server";
import { errMsg } from "@/lib/err";
import { requireUser, authErrorResponse } from "@/lib/auth";
import { resolveStudentForUser } from "@/lib/student";
import { createAdminClient } from "@/lib/supabase/admin";
import { runStage5Variants } from "@/lib/ai/stage5-variants";
import { verifyAnswerOnly } from "@/lib/ai/stage3-verify";
import { MODEL_VERSION_TAG } from "@/lib/constants";
import type { WrongItem } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

// POST /api/items/[id]/variants  { mode:'A'|'B', count?, difficultyDelta? }
// Stage 5 유사문제 생성 → 각 변형을 코드 검산 → '통과분만 verified=true' 로 저장 (스펙 §7-4).
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const supa = createAdminClient();
  try {
    const user = await requireUser();
    const me = await resolveStudentForUser(user);
    const body = (await req.json().catch(() => ({}))) as {
      mode?: "A" | "B";
      count?: number;
      difficultyDelta?: number;
    };
    const mode = body.mode ?? "A";
    const count = Math.min(Math.max(body.count ?? 3, 1), 5);

    const { data: item, error } = await supa
      .from("wrong_items")
      .select("*")
      .eq("id", id)
      .maybeSingle<WrongItem>();
    if (error) throw error;
    if (item && item.student_id !== me.studentId)
      return NextResponse.json({ error: "권한 없음 (본인 오답이 아님)" }, { status: 403 });
    if (!item || !item.problem_latex || !item.correct_answer) {
      return NextResponse.json(
        { error: "먼저 분석(정답·풀이)을 완료해야 유사문제를 만들 수 있음" },
        { status: 400 },
      );
    }

    const variants = await runStage5Variants({
      problem_latex: item.problem_latex,
      stage2: {
        correct_answer: item.correct_answer,
        solution_steps: item.solution_steps,
        key_concepts: item.key_concepts,
        difficulty: item.difficulty ?? 3,
      },
      mode,
      count,
      difficultyDelta: body.difficultyDelta,
    });

    // 각 유사문제 정답을 코드 검산 → 통과분만 verified
    const rows = await Promise.all(
      variants.map(async (v) => {
        const check = await verifyAnswerOnly({
          problem_latex: v.variant_problem_latex,
          candidate_answer: v.generated_answer,
        });
        return {
          wrong_item_id: id,
          mode,
          variant_latex: v.variant_problem_latex,
          generated_answer: v.generated_answer,
          generated_solution: v.generated_solution_steps,
          difficulty: v.difficulty,
          verified: check.verified,
          verification_note: check.note,
          model_version: MODEL_VERSION_TAG,
        };
      }),
    );

    const { data: inserted, error: insErr } = await supa
      .from("generated_problems")
      .insert(rows)
      .select("*");
    if (insErr) throw insErr;

    return NextResponse.json({ variants: inserted });
  } catch (e) {
    const a = authErrorResponse(e);
    if (a) return NextResponse.json({ error: a.error }, { status: a.status });
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}
