import { errMsg } from "@/lib/err";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMyStudent } from "@/lib/student";
import { Card } from "@/components/ui";
import { ReviewSession, type ReviewCard } from "@/components/ReviewSession";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const me = await requireMyStudent();
  let cards: ReviewCard[] = [];
  let dbError: string | null = null;
  try {
    const supa = createAdminClient();
    const { data, error } = await supa
      .from("wrong_items")
      .select(
        "id, problem_latex, problem_text, subject, unit, error_summary, student_reason, error_tags, correct_answer",
      )
      .eq("student_id", me.studentId)
      .eq("status", "analyzed")
      .not("review_due_at", "is", null)
      .lte("review_due_at", new Date().toISOString())
      .order("review_due_at", { ascending: true })
      .limit(20);
    if (error) throw error;
    cards = (data ?? []) as ReviewCard[];
  } catch (e) {
    dbError = errMsg(e);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">오늘의 복습</h1>
      {dbError ? (
        <Card className="text-sm text-amber-600">오류: {dbError}</Card>
      ) : cards.length === 0 ? (
        <Card className="space-y-2 text-sm text-muted">
          <p>오늘 복습할 오답이 없어요 🎉</p>
          <Link href="/notebook" className="text-primary">
            오답노트 보기 →
          </Link>
        </Card>
      ) : (
        <ReviewSession cards={cards} />
      )}
    </div>
  );
}
