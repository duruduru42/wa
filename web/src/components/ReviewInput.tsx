"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ERROR_TAGS } from "@/lib/ai/schemas";
import { Card } from "@/components/ui";

// 복습 엔진(#1): 학생이 틀린 이유를 직접 확인(선택지)+한 줄(주관식)로 메타인지.
export function ReviewInput({
  itemId,
  aiTags,
  initialReason,
  initialTags,
  reviewed,
}: {
  itemId: string;
  aiTags: string[];
  initialReason: string | null;
  initialTags: string[];
  reviewed: boolean;
}) {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>(
    initialTags.length ? initialTags : aiTags,
  );
  const [reason, setReason] = useState(initialReason ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(reviewed);

  function toggle(t: string) {
    setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
    setDone(false);
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/items/${itemId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_reason: reason, student_tags: tags }),
      });
      if (res.ok) {
        setDone(true);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3 border-primary/40">
      <div className="text-sm font-semibold text-primary">
        ✍️ 복습 — 내가 왜 틀렸는지 직접 정리해봐
      </div>

      <div className="space-y-1.5">
        <div className="text-xs text-muted">
          틀린 이유를 골라줘 (AI 추정이 기본 선택돼 있어 — 다르면 바꿔)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ERROR_TAGS.map((t) => {
            const on = tags.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggle(t)}
                className={`rounded-full px-2.5 py-1 text-xs ${
                  on
                    ? "bg-primary text-white"
                    : "border border-border bg-background text-muted"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-xs text-muted">
          한 줄로 — &quot;다음엔 ___을 조심하자&quot; (내 말로 적을수록 안 까먹음)
        </div>
        <input
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setDone(false);
          }}
          placeholder="예: 근을 옮길 때 부호를 바꾸는 걸 잊지 말자"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <button
        onClick={save}
        disabled={busy}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        {busy ? "저장 중…" : done ? "✓ 저장됨 (수정 후 다시 저장)" : "복습 저장"}
      </button>
    </Card>
  );
}
