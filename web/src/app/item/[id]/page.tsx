import { errMsg } from "@/lib/err";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Tex, MixedText } from "@/components/Tex";
import {
  Card,
  ErrorTags,
  SolutionSteps,
  VerificationBadge,
} from "@/components/ui";
import { VariantsPanel } from "@/components/VariantsPanel";
import type { GeneratedProblem, WrongItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supa = createAdminClient();
  const { data, error } = await supa
    .from("wrong_items")
    .select("*, generated_problems(*)")
    .eq("id", id)
    .maybeSingle();
  if (error)
    return <Card className="text-sm text-red-600">DB 오류: {errMsg(error)}</Card>;
  if (!data) notFound();

  const item = data as WrongItem & { generated_problems: GeneratedProblem[] };
  const analyzed = item.status === "analyzed" || item.status === "done";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/notebook" className="text-sm text-muted">
          ← 오답노트
        </Link>
        <span className="text-xs text-muted">
          {new Date(item.created_at).toLocaleString("ko-KR")}
        </span>
      </div>

      {/* 문제 */}
      <Card className="space-y-2">
        <div className="text-xs font-medium text-muted">문제</div>
        {item.problem_latex ? (
          <Tex block>{item.problem_latex}</Tex>
        ) : (
          <p className="text-sm">{item.problem_text}</p>
        )}
        {item.source_image_url && (
          <details className="text-xs text-muted">
            <summary className="cursor-pointer">원본 이미지 보기</summary>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.source_image_url}
              alt="원본"
              className="mt-2 max-h-72 rounded-lg border border-border object-contain"
            />
          </details>
        )}
      </Card>

      {/* 내 답 vs 정답 */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="text-xs font-medium text-muted">내가 쓴 답</div>
          <div className="mt-1 text-sm">
            {item.student_answer ? (
              <MixedText>{item.student_answer}</MixedText>
            ) : (
              <span className="text-muted">(없음)</span>
            )}
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-muted">정답</div>
            {analyzed && (
              <VerificationBadge
                status={item.verification_status}
                note={item.verification_note}
              />
            )}
          </div>
          <div className="mt-1 text-sm font-semibold">
            {item.correct_answer ? (
              <MixedText>{item.correct_answer}</MixedText>
            ) : (
              <span className="text-muted">미분석</span>
            )}
          </div>
        </Card>
      </div>

      {analyzed ? (
        <>
          {item.verification_status === "mismatch" && (
            <Card className="border-amber-300 bg-amber-50 text-sm text-amber-900">
              ⚠️ 코드 검산과 AI 풀이가 불일치합니다. 정답을 사람이 확인하는 것을
              권장합니다. <br />
              <span className="text-xs">{item.verification_note}</span>
            </Card>
          )}

          {/* 모범 풀이 */}
          <Card className="space-y-2">
            <div className="text-xs font-medium text-muted">모범 풀이</div>
            <SolutionSteps steps={item.solution_steps} />
            {item.key_concepts?.length > 0 && (
              <div className="pt-1 text-xs text-muted">
                핵심 개념: {item.key_concepts.join(", ")} · 난이도{" "}
                {item.difficulty}/5
              </div>
            )}
          </Card>

          {/* 오답 원인 */}
          <Card className="space-y-2">
            <div className="text-xs font-medium text-muted">틀린 이유</div>
            <p className="text-sm leading-relaxed">
              <MixedText>{item.error_explanation ?? ""}</MixedText>
            </p>
            <ErrorTags tags={item.error_tags} />
          </Card>
        </>
      ) : (
        <Card className="text-sm text-muted">
          아직 분석되지 않았습니다.
        </Card>
      )}

      {/* 유사문제 + 재분석 (client) */}
      <VariantsPanel
        itemId={item.id}
        analyzed={analyzed}
        initial={item.generated_problems ?? []}
      />
    </div>
  );
}
