import { errMsg } from "@/lib/err";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMyStudent } from "@/lib/student";
import { Card } from "@/components/ui";
import type { WrongItem } from "@/lib/types";

export const dynamic = "force-dynamic";

function Bar({
  label,
  value,
  max,
  href,
}: {
  label: string;
  value: number;
  max: number;
  href?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const row = (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 truncate text-xs">{label}</span>
      <div className="h-4 flex-1 overflow-hidden rounded-full bg-background">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-medium">{value}</span>
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:opacity-80">
      {row}
    </Link>
  ) : (
    row
  );
}

export default async function StatsPage() {
  const me = await requireMyStudent();
  const supa = createAdminClient();
  let items: WrongItem[] = [];
  let attempts: { is_correct: boolean | null }[] = [];
  let dbError: string | null = null;
  try {
    const [a, b] = await Promise.all([
      supa.from("wrong_items").select("*").eq("student_id", me.studentId),
      supa.from("attempts").select("is_correct").eq("student_id", me.studentId),
    ]);
    if (a.error) throw a.error;
    items = (a.data ?? []) as WrongItem[];
    attempts = (b.data ?? []) as { is_correct: boolean | null }[];
  } catch (e) {
    dbError = errMsg(e);
  }

  // 집계
  const tagCount = new Map<string, number>();
  const unitCount = new Map<string, number>();
  const verifyCount = new Map<string, number>();
  for (const it of items) {
    for (const t of it.error_tags ?? [])
      tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    const u = it.unit || it.detected_unit || "단원 미정";
    unitCount.set(u, (unitCount.get(u) ?? 0) + 1);
    verifyCount.set(
      it.verification_status,
      (verifyCount.get(it.verification_status) ?? 0) + 1,
    );
  }
  const tags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]);
  const units = [...unitCount.entries()].sort((a, b) => b[1] - a[1]);
  const maxTag = Math.max(1, ...tags.map((t) => t[1]));
  const maxUnit = Math.max(1, ...units.map((u) => u[1]));

  const graded = attempts.filter((a) => a.is_correct !== null);
  const correct = graded.filter((a) => a.is_correct).length;
  const accuracy =
    graded.length > 0 ? Math.round((correct / graded.length) * 100) : null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">약점 통계</h1>

      {dbError ? (
        <Card className="text-sm text-amber-700">DB 오류: {dbError}</Card>
      ) : items.length === 0 ? (
        <Card className="text-sm text-muted">
          아직 데이터가 없습니다. 오답을 등록하면 누적 통계가 표시됩니다.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center">
              <div className="text-2xl font-bold">{items.length}</div>
              <div className="text-xs text-muted">총 오답</div>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold">
                {verifyCount.get("mismatch") ?? 0}
              </div>
              <div className="text-xs text-muted">검산 불일치</div>
            </Card>
            <Card className="text-center">
              <div className="text-2xl font-bold">
                {accuracy === null ? "—" : `${accuracy}%`}
              </div>
              <div className="text-xs text-muted">재채점 정답률</div>
            </Card>
          </div>

          <Card className="space-y-2">
            <div className="text-xs font-medium text-muted">
              오답 원인 태그 (클릭 시 해당 오답만 보기)
            </div>
            {tags.length === 0 ? (
              <p className="text-sm text-muted">태깅된 오답이 없습니다.</p>
            ) : (
              <div className="space-y-1.5">
                {tags.map(([t, c]) => (
                  <Bar
                    key={t}
                    label={t}
                    value={c}
                    max={maxTag}
                    href={`/notebook?tag=${encodeURIComponent(t)}`}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-2">
            <div className="text-xs font-medium text-muted">단원별 약점</div>
            <div className="space-y-1.5">
              {units.map(([u, c]) => (
                <Bar key={u} label={u} value={c} max={maxUnit} />
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
