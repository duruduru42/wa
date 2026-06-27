"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Tex, MixedText } from "./Tex";
import { Card, SolutionSteps } from "./ui";
import type { GeneratedProblem } from "@/lib/types";

export function VariantsPanel({
  itemId,
  analyzed,
  initial,
}: {
  itemId: string;
  analyzed: boolean;
  initial: GeneratedProblem[];
}) {
  const router = useRouter();
  const [variants, setVariants] = useState<GeneratedProblem[]>(initial);
  const [busy, setBusy] = useState<null | "A" | "B" | "C" | "reanalyze">(null);
  const [err, setErr] = useState<string | null>(null);

  async function generate(mode: "A" | "B" | "C") {
    setBusy(mode);
    setErr(null);
    try {
      const res = await fetch(`/api/items/${itemId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, count: 3 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "생성 실패");
      setVariants((prev) => [...json.variants, ...prev]);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function reanalyze() {
    setBusy("reanalyze");
    setErr(null);
    try {
      const res = await fetch(`/api/items/${itemId}/analyze`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "재분석 실패");
      router.refresh();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          disabled={!analyzed || busy !== null}
          onClick={() => generate("A")}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy === "A" ? "생성 중…" : "유사문제 (모드 A·숫자변형)"}
        </button>
        <button
          disabled={!analyzed || busy !== null}
          onClick={() => generate("B")}
          className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy === "B" ? "생성 중…" : "유사문제 (모드 B·접근법동일)"}
        </button>
        <button
          disabled={!analyzed || busy !== null}
          onClick={() => generate("C")}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy === "C" ? "생성 중…" : "🧠 생각 유도 (식 세우기)"}
        </button>
        <button
          disabled={busy !== null}
          onClick={reanalyze}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm disabled:opacity-40"
        >
          {busy === "reanalyze" ? "재분석 중…" : "재분석"}
        </button>
      </div>
      {!analyzed && (
        <p className="text-xs text-muted">
          유사문제는 분석(정답·풀이) 완료 후 생성할 수 있습니다.
        </p>
      )}
      {err && <Card className="text-sm text-red-600">오류: {err}</Card>}

      {variants.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted">
            유사문제 ({variants.length})
          </div>
          {variants.map((v) => (
            <VariantCard key={v.id} v={v} />
          ))}
        </div>
      )}
    </div>
  );
}

function VariantCard({ v }: { v: GeneratedProblem }) {
  if (v.mode === "C") return <ThinkingCard v={v} />;
  return <SolveCard v={v} />;
}

// 모드 C: 풀게 하지 않고, 조건/단계별로 '먼저 생각 → 펼쳐서 모범 사고 확인'
function ThinkingCard({ v }: { v: GeneratedProblem }) {
  const steps = v.thinking_steps ?? [];
  return (
    <Card className="space-y-3 border-emerald-600/40">
      <div className="text-xs font-semibold text-emerald-500">
        🧠 생각 유도 · 계산 말고 &quot;식 세우는 과정&quot;을 연습해봐
      </div>
      <Tex block>{v.variant_latex}</Tex>
      <div className="space-y-2">
        {steps.map((s, i) => (
          <ThinkingStepRow key={i} index={i + 1} step={s} />
        ))}
      </div>
    </Card>
  );
}

function ThinkingStepRow({
  index,
  step,
}: {
  index: number;
  step: { label: string; prompt: string; guide: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-background p-2.5">
      <div className="text-xs font-medium text-emerald-500">
        {index}. {step.label}
      </div>
      <p className="mt-1 text-sm">
        <MixedText>{step.prompt}</MixedText>
      </p>
      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-1.5 text-xs text-primary"
      >
        {open ? "접기" : "💡 먼저 생각해보고 → 모범 사고 보기"}
      </button>
      {open && (
        <p className="mt-1.5 rounded bg-card p-2 text-sm leading-relaxed text-foreground/85">
          <MixedText>{step.guide}</MixedText>
        </p>
      )}
    </div>
  );
}

function SolveCard({ v }: { v: GeneratedProblem }) {
  const [show, setShow] = useState(false);
  const [answer, setAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<{
    is_correct: boolean | null;
    method: string;
    note: string;
  } | null>(null);

  async function grade() {
    if (!answer.trim()) return;
    setGrading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/variants/${v.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submitted_answer: answer }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "채점 실패");
      setResult(json);
    } catch (e) {
      setResult({ is_correct: null, method: "unknown", note: String(e) });
    } finally {
      setGrading(false);
    }
  }

  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">
          모드 {v.mode} · 난이도 {v.difficulty}/5
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            v.verified
              ? "bg-green-100 text-green-800"
              : "bg-amber-100 text-amber-900"
          }`}
          title={v.verification_note ?? undefined}
        >
          {v.verified ? "✅ 검산 통과" : "⚠️ 미검증"}
        </span>
      </div>
      <Tex block>{v.variant_latex}</Tex>

      {/* 풀어보기 — 재채점 루프 (스펙 §6-4, §9 Phase2) */}
      <div className="flex gap-2">
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && grade()}
          placeholder="답 입력 (예: 2, 3)"
          className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
        />
        <button
          onClick={grade}
          disabled={grading || !answer.trim()}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {grading ? "채점 중…" : "채점"}
        </button>
      </div>

      {result && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            result.is_correct === true
              ? "bg-green-50 text-green-800"
              : result.is_correct === false
                ? "bg-red-50 text-red-700"
                : "bg-gray-100 text-gray-600"
          }`}
        >
          {result.is_correct === true
            ? "⭕ 정답입니다!"
            : result.is_correct === false
              ? "❌ 틀렸어요. 다시 풀어보고 정답·풀이를 확인하세요."
              : "❔ 자동 채점 보류"}
          <span className="ml-1 text-xs opacity-70">
            ({result.method}) {result.note}
          </span>
        </div>
      )}

      <button onClick={() => setShow((s) => !s)} className="text-xs text-primary">
        {show ? "정답·풀이 숨기기" : "정답·풀이 보기"}
      </button>
      {show && (
        <div className="space-y-2 rounded-lg bg-background p-2">
          <div className="text-sm">
            <span className="text-xs text-muted">정답: </span>
            <b>{v.generated_answer}</b>
          </div>
          <SolutionSteps steps={v.generated_solution} />
        </div>
      )}
    </Card>
  );
}
