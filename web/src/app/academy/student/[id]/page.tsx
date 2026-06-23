import { errMsg } from "@/lib/err";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createRLSClient } from "@/lib/supabase/server";
import { Card, ErrorTags, VerificationBadge } from "@/components/ui";
import { ReportButton } from "@/components/ReportButton";
import type { WrongItem } from "@/lib/types";

type ReportRow = {
  id: string;
  channel: string;
  status: string;
  to_label: string | null;
  created_at: string;
};

export const dynamic = "force-dynamic";

export default async function StudentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supa = await createRLSClient();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) redirect("/login");
  let name = "";
  let items: WrongItem[] = [];
  let reports: ReportRow[] = [];
  let dbError: string | null = null;
  try {
    const [s, w, r] = await Promise.all([
      supa.from("students").select("name, grade, school").eq("id", id).maybeSingle(),
      supa
        .from("wrong_items")
        .select("*")
        .eq("student_id", id)
        .order("created_at", { ascending: false }),
      supa
        .from("parent_reports")
        .select("id, channel, status, to_label, created_at")
        .eq("student_id", id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    if (s.error) throw s.error;
    if (!s.data) notFound();
    name = s.data.name;
    items = (w.data ?? []) as WrongItem[];
    reports = (r.data ?? []) as ReportRow[];
  } catch (e) {
    dbError = errMsg(e);
  }

  const tagCount = new Map<string, number>();
  const unitCount = new Map<string, number>();
  for (const it of items) {
    for (const t of it.error_tags ?? [])
      tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    const u = it.unit ?? "단원 미정";
    unitCount.set(u, (unitCount.get(u) ?? 0) + 1);
  }
  const tags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]);
  const units = [...unitCount.entries()].sort((a, b) => b[1] - a[1]);

  if (dbError)
    return <Card className="text-sm text-amber-700">오류: {dbError}</Card>;

  return (
    <div className="space-y-4">
      <Link href="/academy" className="text-sm text-muted">
        ← 대시보드
      </Link>
      <h1 className="text-xl font-bold">{name} · 약점 리포트</h1>

      <div className="grid grid-cols-2 gap-3">
        <Card className="space-y-2">
          <div className="text-xs font-medium text-muted">원인 태그</div>
          {tags.length ? (
            tags.map(([t, c]) => (
              <div key={t} className="flex justify-between text-sm">
                <span>#{t}</span>
                <b>{c}</b>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">데이터 없음</p>
          )}
        </Card>
        <Card className="space-y-2">
          <div className="text-xs font-medium text-muted">단원별</div>
          {units.map(([u, c]) => (
            <div key={u} className="flex justify-between text-sm">
              <span>{u}</span>
              <b>{c}</b>
            </div>
          ))}
        </Card>
      </div>

      <Card className="space-y-2">
        <div className="text-xs font-medium text-muted">학부모 리포트</div>
        <ReportButton studentId={id} />
        {reports.length > 0 && (
          <ul className="mt-1 space-y-1 text-xs text-muted">
            {reports.map((r) => (
              <li key={r.id} className="flex justify-between">
                <span>
                  {r.status === "sent" ? "✅" : r.status === "mock" ? "🧪" : "⚠️"}{" "}
                  {r.to_label} · {r.channel.toUpperCase()}
                </span>
                <span>{new Date(r.created_at).toLocaleString("ko-KR")}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted">오답 목록 ({items.length})</div>
        {items.map((it) => (
          <Card key={it.id} className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm">
                {it.problem_text || it.problem_latex}
              </div>
              <div className="mt-1">
                <ErrorTags tags={it.error_tags} />
              </div>
            </div>
            <VerificationBadge
              status={it.verification_status}
              note={it.verification_note}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
