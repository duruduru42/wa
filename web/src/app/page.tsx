import { errMsg } from "@/lib/err";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRLSClient } from "@/lib/supabase/server";
import { resolveStudentForUser } from "@/lib/student";
import { Card, VerificationBadge, ErrorTags } from "@/components/ui";
import type { WrongItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const rls = await createRLSClient();
  const {
    data: { user },
  } = await rls.auth.getUser();

  let items: WrongItem[] = [];
  let reviewDue = 0;
  let dbError: string | null = null;
  if (user) {
    try {
      const me = await resolveStudentForUser(user);
      const supa = createAdminClient();
      const [list, due] = await Promise.all([
        supa
          .from("wrong_items")
          .select("*")
          .eq("student_id", me.studentId)
          .order("created_at", { ascending: false })
          .limit(5),
        supa
          .from("wrong_items")
          .select("id", { count: "exact", head: true })
          .eq("student_id", me.studentId)
          .eq("status", "analyzed")
          .not("review_due_at", "is", null)
          .lte("review_due_at", new Date().toISOString()),
      ]);
      if (list.error) throw list.error;
      items = (list.data ?? []) as WrongItem[];
      reviewDue = due.count ?? 0;
    } catch (e) {
      dbError = errMsg(e);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-6 text-white">
        <h1 className="text-2xl font-bold">사진 한 장으로 오답노트</h1>
        <p className="mt-1 text-sm text-indigo-100">
          틀린 문제를 찍으면 AI가 유형·원인을 분석하고, 검산까지 마친 풀이와
          유사문제를 만들어 줍니다.
        </p>
        <Link
          href="/capture"
          className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary"
        >
          + 새 오답 등록
        </Link>
      </section>

      {reviewDue > 0 && (
        <Link href="/review" className="block">
          <Card className="flex items-center justify-between border-primary/50 bg-primary/10 hover:border-primary">
            <div>
              <div className="text-sm font-semibold">
                📅 오늘 복습할 오답 {reviewDue}개
              </div>
              <div className="text-xs text-muted">
                틀린 이유를 떠올려보며 복습하면 안 까먹어요
              </div>
            </div>
            <span className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white">
              복습 시작
            </span>
          </Card>
        </Link>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">최근 오답</h2>
          <Link href="/notebook" className="text-sm text-primary">
            전체 보기 →
          </Link>
        </div>

        {!user ? (
          <Card className="text-sm text-muted">
            로그인하면 내 오답노트가 여기에 표시됩니다.{" "}
            <Link href="/login" className="font-medium text-primary">
              로그인 →
            </Link>
          </Card>
        ) : dbError ? (
          <Card className="text-sm text-amber-700">
            DB 연결 실패 — Supabase 로컬이 켜져 있는지 확인하세요.
            <pre className="mt-2 overflow-x-auto text-xs text-muted">
              {dbError}
            </pre>
          </Card>
        ) : items.length === 0 ? (
          <Card className="text-sm text-muted">
            아직 등록된 오답이 없습니다. 첫 문제를 등록해 보세요.
          </Card>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id}>
                <Link href={`/item/${it.id}`}>
                  <Card className="space-y-1.5 hover:border-primary">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 truncate text-sm font-medium">
                        {it.problem_text || it.problem_latex || "(추출 중)"}
                      </div>
                      <VerificationBadge
                        status={it.verification_status}
                        note={it.verification_note}
                      />
                    </div>
                    <div className="text-xs text-muted">
                      {(it.subject ?? "수학") + " · " + (it.unit ?? "단원 미정")}
                    </div>
                    <ErrorTags
                      tags={
                        it.student_tags?.length ? it.student_tags : it.error_tags
                      }
                    />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
