import type { VerificationStatus } from "@/lib/types";
import type { SolutionStep } from "@/lib/ai/schemas";
import { MixedText } from "./Tex";

// 신뢰도 배지 — 모든 AI 산출물에 검증 상태 노출 (스펙 §8)
export function VerificationBadge({
  status,
  note,
}: {
  status: VerificationStatus;
  note?: string | null;
}) {
  const map: Record<VerificationStatus, { label: string; cls: string }> = {
    verified: { label: "✅ 검산 통과", cls: "bg-green-100 text-green-800" },
    mismatch: {
      label: "⚠️ 불일치 — 사람 검수 권장",
      cls: "bg-amber-100 text-amber-900",
    },
    unverifiable: { label: "❔ 검증 불가", cls: "bg-gray-100 text-gray-700" },
    pending: { label: "… 대기", cls: "bg-gray-100 text-gray-500" },
  };
  const m = map[status];
  return (
    <span
      title={note ?? undefined}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

export function ErrorTags({ tags }: { tags: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
        >
          #{t}
        </span>
      ))}
    </div>
  );
}

export function SolutionSteps({ steps }: { steps: SolutionStep[] }) {
  if (!steps?.length) return null;
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {s.step ?? i + 1}
          </span>
          <div className="text-sm leading-relaxed">
            {s.title && <div className="font-medium">{s.title}</div>}
            <MixedText>{s.detail}</MixedText>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
