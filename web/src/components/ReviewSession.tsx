"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tex, MixedText } from "./Tex";
import { Card, ErrorTags } from "./ui";

export type ReviewCard = {
  id: string;
  problem_latex: string | null;
  problem_text: string | null;
  subject: string | null;
  unit: string | null;
  error_summary: string | null;
  student_reason: string | null;
  error_tags: string[];
  correct_answer: string | null;
};

const RATINGS = [
  { q: 2, label: "또 틀릴 듯", cls: "bg-red-500/15 text-red-500" },
  { q: 3, label: "애매함", cls: "bg-amber-500/15 text-amber-500" },
  { q: 5, label: "완벽히 떠올림", cls: "bg-emerald-500/15 text-emerald-500" },
];

export function ReviewSession({ cards }: { cards: ReviewCard[] }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (i >= cards.length) {
    return (
      <Card className="space-y-2 text-center">
        <div className="text-2xl">🎉</div>
        <div className="text-sm font-medium">오늘 복습 완료!</div>
        <button
          onClick={() => router.push("/")}
          className="mt-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          홈으로
        </button>
      </Card>
    );
  }

  const c = cards[i];

  async function rate(quality: number) {
    setBusy(true);
    try {
      await fetch(`/api/items/${c.id}/review-grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quality }),
      });
    } finally {
      setBusy(false);
      setRevealed(false);
      setI((n) => n + 1);
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted">
        {i + 1} / {cards.length} · {(c.subject ?? "수학") + " · " + (c.unit ?? "단원 미정")}
      </div>

      <Card className="space-y-2">
        <div className="text-xs font-medium text-muted">문제</div>
        {c.problem_latex ? (
          <Tex block>{c.problem_latex}</Tex>
        ) : (
          <p className="text-sm">{c.problem_text}</p>
        )}
      </Card>

      {!revealed ? (
        <Card className="space-y-3 border-primary/40 text-center">
          <p className="text-sm text-muted">
            이 문제, <b className="text-foreground">왜 틀렸는지 · 어떻게 푸는지</b>
            <br />
            먼저 머릿속으로 떠올려보세요.
          </p>
          <button
            onClick={() => setRevealed(true)}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white"
          >
            떠올렸어요 — 확인하기
          </button>
        </Card>
      ) : (
        <>
          <Card className="space-y-2">
            {c.error_summary && (
              <p className="text-base font-bold leading-snug">
                💡 <MixedText>{c.error_summary}</MixedText>
              </p>
            )}
            {c.student_reason && (
              <p className="text-sm text-muted">
                ✍️ 내가 적은 다짐: <MixedText>{c.student_reason}</MixedText>
              </p>
            )}
            <ErrorTags tags={c.error_tags} />
            {c.correct_answer && (
              <div className="text-sm">
                <span className="text-xs text-muted">정답: </span>
                <b>
                  <MixedText>{c.correct_answer}</MixedText>
                </b>
              </div>
            )}
          </Card>

          <div className="text-center text-xs text-muted">
            얼마나 잘 떠올렸나요?
          </div>
          <div className="grid grid-cols-3 gap-2">
            {RATINGS.map((r) => (
              <button
                key={r.q}
                disabled={busy}
                onClick={() => rate(r.q)}
                className={`rounded-lg py-3 text-sm font-semibold disabled:opacity-40 ${r.cls}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
