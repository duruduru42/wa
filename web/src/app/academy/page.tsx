import { errMsg } from "@/lib/err";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createRLSClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import type { WrongItem } from "@/lib/types";

export const dynamic = "force-dynamic";

// Phase 3 학원 대시보드 — RLS 강제(스펙 §7-6). 세션 클라이언트로 조회하므로
// 로그인한 교사/관리자의 테넌트 데이터만 보인다(service-role 우회 아님).
type StudentRow = { id: string; name: string; class_id: string | null };
type ClassRow = { id: string; name: string };

export default async function AcademyPage() {
  const supa = await createRLSClient();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) redirect("/login");

  // 내 멤버십에서 테넌트·역할 해석 (RLS: 본인 테넌트만 조회됨)
  const { data: myMemberships } = await supa
    .from("memberships")
    .select("tenant_id, role, display_name")
    .eq("user_id", user.id);
  const staff = (myMemberships ?? []).find(
    (m) => m.role === "teacher" || m.role === "admin",
  );
  if (!staff) {
    return (
      <Card className="text-sm text-muted">
        이 계정에는 학원(교사/관리자) 권한이 없습니다. ({user.email})
      </Card>
    );
  }
  const tenantId = staff.tenant_id;

  let tenantName = "";
  let classes: ClassRow[] = [];
  let students: StudentRow[] = [];
  let items: WrongItem[] = [];
  let dbError: string | null = null;
  try {
    const [t, c, s, w] = await Promise.all([
      supa.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
      supa.from("classes").select("id, name").eq("tenant_id", tenantId),
      supa.from("students").select("id, name, class_id").eq("tenant_id", tenantId),
      supa.from("wrong_items").select("*").eq("tenant_id", tenantId),
    ]);
    if (t.error) throw t.error;
    tenantName = t.data?.name ?? "학원";
    classes = (c.data ?? []) as ClassRow[];
    students = (s.data ?? []) as StudentRow[];
    items = (w.data ?? []) as WrongItem[];
  } catch (e) {
    dbError = errMsg(e);
  }

  const perStudent = new Map<
    string,
    { count: number; mismatch: number; tags: Map<string, number> }
  >();
  for (const it of items) {
    const cur =
      perStudent.get(it.student_id) ??
      { count: 0, mismatch: 0, tags: new Map<string, number>() };
    cur.count++;
    if (it.verification_status === "mismatch") cur.mismatch++;
    for (const tag of it.error_tags ?? [])
      cur.tags.set(tag, (cur.tags.get(tag) ?? 0) + 1);
    perStudent.set(it.student_id, cur);
  }
  const topTag = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  if (dbError)
    return <Card className="text-sm text-amber-700">학원 데이터 오류: {dbError}</Card>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">{tenantName} · 대시보드</h1>
        <p className="text-sm text-muted">
          {staff.display_name ?? user.email} · 학생 {students.length}명 · 반{" "}
          {classes.length}개 · 누적 오답 {items.length}건
        </p>
      </div>

      {classes.map((cls) => {
        const roster = students.filter((s) => s.class_id === cls.id);
        return (
          <section key={cls.id} className="space-y-2">
            <h2 className="font-semibold">{cls.name}</h2>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-background text-xs text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">학생</th>
                    <th className="px-3 py-2 text-right">오답</th>
                    <th className="px-3 py-2 text-right">검산 불일치</th>
                    <th className="px-3 py-2 text-left">주요 약점</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((st) => {
                    const agg = perStudent.get(st.id);
                    return (
                      <tr key={st.id} className="border-t border-border">
                        <td className="px-3 py-2">
                          <Link
                            href={`/academy/student/${st.id}`}
                            className="text-primary hover:underline"
                          >
                            {st.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-right">{agg?.count ?? 0}</td>
                        <td className="px-3 py-2 text-right">
                          {agg?.mismatch ? (
                            <span className="text-amber-700">{agg.mismatch}</span>
                          ) : (
                            0
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {agg ? (
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                              #{topTag(agg.tags)}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {roster.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-center text-muted">
                        학생이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
