import { errMsg } from "@/lib/err";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMyStudent } from "@/lib/student";
import { ERROR_TAGS } from "@/lib/ai/schemas";
import { Card, ErrorTags, VerificationBadge } from "@/components/ui";
import { ExportButton } from "@/components/ExportButton";
import type { WrongItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NotebookPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const me = await requireMyStudent();
  let items: WrongItem[] = [];
  let dbError: string | null = null;
  try {
    const supa = createAdminClient();
    let q = supa
      .from("wrong_items")
      .select("*")
      .eq("student_id", me.studentId)
      .order("created_at", { ascending: false });
    if (tag) q = q.contains("error_tags", [tag]);
    const { data, error } = await q;
    if (error) throw error;
    items = (data ?? []) as WrongItem[];
  } catch (e) {
    dbError = errMsg(e);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">오답노트</h1>
        {/* PDF 내보내기 — 현재 태그 필터 범위로 (스펙 §6-6) */}
        <ExportButton tag={tag} />
      </div>

      {/* 원인 태그 필터 (스펙 §6-5) */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href="/notebook"
          className={`rounded-full px-2.5 py-1 text-xs ${
            !tag ? "bg-primary text-white" : "bg-card border border-border"
          }`}
        >
          전체
        </Link>
        {ERROR_TAGS.map((t) => (
          <Link
            key={t}
            href={`/notebook?tag=${encodeURIComponent(t)}`}
            className={`rounded-full px-2.5 py-1 text-xs ${
              tag === t ? "bg-primary text-white" : "bg-card border border-border"
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {dbError ? (
        <Card className="text-sm text-amber-700">DB 오류: {dbError}</Card>
      ) : items.length === 0 ? (
        <Card className="text-sm text-muted">해당하는 오답이 없습니다.</Card>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id}>
              <Link href={`/item/${it.id}`}>
                <Card className="space-y-1.5 hover:border-primary">
                  {/* 문제 한 줄 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 truncate text-sm font-medium">
                      {it.problem_text || it.problem_latex || "(추출 중)"}
                    </div>
                    <VerificationBadge
                      status={it.verification_status}
                      note={it.verification_note}
                    />
                  </div>
                  {/* 단원 */}
                  <div className="text-xs text-muted">
                    {(it.subject ?? "수학") + " · " + (it.unit ?? "단원 미정")}
                    {it.reviewed_at ? " · ✅ 복습함" : ""}
                  </div>
                  {/* 틀린 이유 (칩) */}
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
    </div>
  );
}
