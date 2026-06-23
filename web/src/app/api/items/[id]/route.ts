import { NextResponse } from "next/server";
import { errMsg } from "@/lib/err";
import { requireUser, authErrorResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/items/[id]
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const supa = createAdminClient();
  const { data, error } = await supa
    .from("wrong_items")
    .select("*, generated_problems(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: errMsg(error) }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(data);
}

// PATCH /api/items/[id] — Stage 1 결과 사용자 교정 (LaTeX/답/풀이)
// 스펙 §2: 사용자가 OCR 결과를 고치면 이후 스테이지를 다시 돌릴 수 있어야 함.
const EDITABLE = new Set([
  "problem_latex",
  "problem_text",
  "student_answer",
  "student_work",
  "subject",
  "unit",
  "source_textbook",
  "source_page",
]);

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    await requireUser();
  } catch (e) {
    const a = authErrorResponse(e);
    if (a) return NextResponse.json({ error: a.error }, { status: a.status });
    throw e;
  }
  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (EDITABLE.has(k)) patch[k] = v;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "수정 가능한 필드 없음" }, { status: 400 });
  }
  const supa = createAdminClient();
  const { data, error } = await supa
    .from("wrong_items")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: errMsg(error) }, { status: 500 });
  return NextResponse.json(data);
}
