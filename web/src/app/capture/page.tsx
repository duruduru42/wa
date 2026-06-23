"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Tex } from "@/components/Tex";
import { Card } from "@/components/ui";
import type { Stage1 } from "@/lib/ai/schemas";

type Phase = "idle" | "extracting" | "review" | "analyzing";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"] as const;

export default function CapturePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Stage1 | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(file: File) {
    setErr(null);
    const mediaType = (ACCEPTED as readonly string[]).includes(file.type)
      ? (file.type as (typeof ACCEPTED)[number])
      : "image/jpeg";
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    setPreview(dataUrl);
    const base64 = dataUrl.split(",")[1];

    setPhase("extracting");
    try {
      const res = await fetch("/api/items/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "추출 실패");
      if (json.duplicate) {
        router.push(`/item/${json.id}`);
        return;
      }
      setItemId(json.id);
      setDraft(json.stage1 as Stage1);
      setPhase("review");
    } catch (e) {
      setErr(String(e));
      setPhase("idle");
    }
  }

  async function analyze() {
    if (!itemId || !draft) return;
    setPhase("analyzing");
    setErr(null);
    try {
      // 1) 사용자 교정 반영 (스펙 §2: 교정 후 [3]부터 재실행 가능)
      await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_latex: draft.problem_latex,
          problem_text: draft.problem_plaintext,
          student_answer: draft.student_answer,
          student_work: draft.student_work,
        }),
      });
      // 2) Stage 2→3→4
      const res = await fetch(`/api/items/${itemId}/analyze`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "분석 실패");
      router.push(`/item/${itemId}`);
    } catch (e) {
      setErr(String(e));
      setPhase("review");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">새 오답 등록</h1>

      {phase === "idle" && (
        <Card className="space-y-3">
          <p className="text-sm text-muted">
            틀린 문제를 촬영하거나 사진을 선택하세요. 인쇄체 문제와 손글씨 풀이가
            함께 있어도 됩니다.
          </p>
          <label className="block">
            <span className="sr-only">사진 선택</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-white"
            />
          </label>
        </Card>
      )}

      {preview && phase !== "idle" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="업로드한 문제"
          className="max-h-64 w-full rounded-xl border border-border object-contain"
        />
      )}

      {(phase === "extracting" || phase === "analyzing") && (
        <Card className="flex items-center gap-3 text-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          {phase === "extracting"
            ? "이미지에서 문제를 추출하는 중…"
            : "정답·검산·오답원인을 분석하는 중… (수십 초)"}
        </Card>
      )}

      {err && (
        <Card className="text-sm text-red-600">오류: {err}</Card>
      )}

      {phase === "review" && draft && (
        <div className="space-y-4">
          <Card className="space-y-1">
            <div className="text-xs text-muted">
              추출 신뢰도{" "}
              <b
                className={
                  draft.confidence < 0.6 ? "text-amber-600" : "text-green-600"
                }
              >
                {Math.round(draft.confidence * 100)}%
              </b>
              {draft.confidence < 0.6 &&
                " — 낮습니다. 아래 내용을 꼭 확인·수정하세요."}
            </div>
          </Card>

          <EditField
            label="문제 (LaTeX)"
            value={draft.problem_latex}
            onChange={(v) => setDraft({ ...draft, problem_latex: v })}
            preview={draft.problem_latex}
          />
          <EditField
            label="문제 (평문)"
            value={draft.problem_plaintext}
            onChange={(v) => setDraft({ ...draft, problem_plaintext: v })}
          />
          <EditField
            label="내가 쓴 답"
            value={draft.student_answer ?? ""}
            onChange={(v) => setDraft({ ...draft, student_answer: v })}
          />
          <EditField
            label="내 풀이 (선택)"
            value={draft.student_work ?? ""}
            onChange={(v) => setDraft({ ...draft, student_work: v })}
          />

          <button
            onClick={analyze}
            className="w-full rounded-lg bg-primary py-3 font-semibold text-white"
          >
            이 내용으로 분석하기
          </button>
        </div>
      )}
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  preview,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  preview?: string;
}) {
  return (
    <Card className="space-y-2">
      <label className="text-xs font-medium text-muted">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full resize-y rounded-lg border border-border bg-background p-2 text-sm"
      />
      {preview !== undefined && value && (
        <div className="rounded-lg bg-background p-2 text-sm">
          <span className="text-xs text-muted">미리보기: </span>
          <Tex block>{preview}</Tex>
        </div>
      )}
    </Card>
  );
}
