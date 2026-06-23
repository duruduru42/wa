import "katex/dist/katex.min.css";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_STUDENT_ID } from "@/lib/constants";
import { TexServer, MixedTextServer } from "@/components/TexServer";
import type { WrongItem } from "@/lib/types";

export const dynamic = "force-dynamic";

// 인쇄 전용 페이지. Playwright가 이 URL을 PDF로 렌더한다.
// mode=full(해설 포함) | exam(정답·해설 숨김 시험지) — 스펙 §6-6.
export default async function PrintNotebook({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; mode?: string; tag?: string }>;
}) {
  const { ids, mode = "full", tag } = await searchParams;
  const exam = mode === "exam";

  const supa = createAdminClient();
  let q = supa
    .from("wrong_items")
    .select("*")
    .eq("student_id", DEFAULT_STUDENT_ID)
    .order("created_at", { ascending: true });
  if (ids) q = q.in("id", ids.split(",").filter(Boolean));
  if (tag) q = q.contains("error_tags", [tag]);
  const { data } = await q;
  const items = (data ?? []) as WrongItem[];

  return (
    <div className="print-root">
      <style>{PRINT_CSS}</style>
      <header className="print-header">
        <h1>오답노트 {exam ? "(시험지 모드)" : "(해설 포함)"}</h1>
        <div className="print-meta">
          총 {items.length}문항 · 생성 {new Date().toLocaleDateString("ko-KR")}
        </div>
      </header>

      {items.map((it, idx) => (
        <article key={it.id} className="q">
          <div className="q-head">
            <span className="q-no">{idx + 1}</span>
            <span className="q-tag">
              {(it.subject ?? "수학")} · {it.unit ?? "단원 미정"}
              {it.difficulty ? ` · 난이도 ${it.difficulty}/5` : ""}
            </span>
          </div>

          <div className="q-body">
            {it.problem_latex ? (
              <TexServer block>{it.problem_latex}</TexServer>
            ) : (
              <p>{it.problem_text}</p>
            )}
          </div>

          {exam ? (
            <div className="answer-space">답:</div>
          ) : (
            <div className="explain">
              <div className="row">
                <b>정답</b>
                <span>
                  <MixedTextServer>{it.correct_answer ?? "-"}</MixedTextServer>
                </span>
              </div>
              {it.solution_steps?.length > 0 && (
                <div className="sol">
                  <b>풀이</b>
                  <ol>
                    {it.solution_steps.map((s, i) => (
                      <li key={i}>
                        <MixedTextServer>{s.detail}</MixedTextServer>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {it.error_explanation && (
                <div className="why">
                  <b>틀린 이유</b>{" "}
                  <MixedTextServer>{it.error_explanation}</MixedTextServer>
                  {it.error_tags?.length > 0 && (
                    <span className="tags">
                      {it.error_tags.map((t) => ` #${t}`)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </article>
      ))}

      {items.length === 0 && <p>내보낼 오답이 없습니다.</p>}
    </div>
  );
}

const PRINT_CSS = `
  .print-root { font-family: system-ui, "Malgun Gothic", sans-serif; color:#111; padding:0; }
  .print-header { border-bottom:2px solid #4f46e5; padding-bottom:8px; margin-bottom:16px; }
  .print-header h1 { font-size:20px; font-weight:700; margin:0; }
  .print-meta { font-size:12px; color:#666; margin-top:4px; }
  .q { page-break-inside: avoid; border:1px solid #e6e8ec; border-radius:8px; padding:12px 14px; margin-bottom:12px; }
  .q-head { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
  .q-no { display:inline-flex; width:22px; height:22px; align-items:center; justify-content:center; background:#eef2ff; color:#4f46e5; border-radius:50%; font-size:12px; font-weight:700; }
  .q-tag { font-size:11px; color:#666; }
  .q-body { font-size:15px; margin-bottom:8px; }
  .answer-space { margin-top:24px; border-top:1px dashed #ccc; padding-top:6px; font-size:13px; color:#888; height:48px; }
  .explain { font-size:13px; background:#f7f8fa; border-radius:6px; padding:8px 10px; }
  .explain .row { display:flex; gap:8px; }
  .explain b { color:#4f46e5; }
  .sol ol { margin:4px 0 0 18px; padding:0; }
  .sol li { margin:2px 0; }
  .why { margin-top:6px; }
  .why .tags { color:#6366f1; font-size:11px; }
  .katex-block { display:block; margin:4px 0; }
  @page { size: A4; margin: 14mm; }
`;
