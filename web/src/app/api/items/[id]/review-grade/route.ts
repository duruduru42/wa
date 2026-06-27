import { NextResponse } from "next/server";
import { errMsg } from "@/lib/err";
import { requireUser, authErrorResponse } from "@/lib/auth";
import { resolveStudentForUser } from "@/lib/student";
import { createAdminClient } from "@/lib/supabase/admin";
import { sm2, dueAfterDays } from "@/lib/sm2";
import type { WrongItem } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/items/[id]/review-grade  { quality: 2|3|5 }
// 간격반복 복습 채점 → SM-2로 다음 복습일 갱신.
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const supa = createAdminClient();
  try {
    const user = await requireUser();
    const me = await resolveStudentForUser(user);
    const { quality } = (await req.json()) as { quality: number };
    if (![2, 3, 5].includes(quality))
      return NextResponse.json({ error: "quality 2|3|5" }, { status: 400 });

    const { data: item, error } = await supa
      .from("wrong_items")
      .select("id, student_id, review_interval, review_ease, review_reps")
      .eq("id", id)
      .maybeSingle<
        Pick<
          WrongItem,
          "id" | "student_id" | "review_interval" | "review_ease" | "review_reps"
        >
      >();
    if (error) throw error;
    if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (item.student_id !== me.studentId)
      return NextResponse.json({ error: "본인 오답이 아님" }, { status: 403 });

    const next = sm2(
      {
        interval: item.review_interval ?? 0,
        ease: item.review_ease ?? 2.5,
        reps: item.review_reps ?? 0,
      },
      quality,
    );

    const { error: upErr } = await supa
      .from("wrong_items")
      .update({
        review_interval: next.interval,
        review_ease: next.ease,
        review_reps: next.reps,
        review_due_at: dueAfterDays(next.interval),
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (upErr) throw upErr;

    return NextResponse.json({ ok: true, next_in_days: next.interval });
  } catch (e) {
    const a = authErrorResponse(e);
    if (a) return NextResponse.json({ error: a.error }, { status: a.status });
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}
