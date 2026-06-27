import type { VerificationStatus } from "@/lib/types";
import type { SolutionStep } from "@/lib/ai/schemas";
import { MixedText } from "./Tex";

// 검산 상태 — 평소엔 숨기고 '불일치'일 때만 표시(답이 검산과 달라 재확인 필요).
export function VerificationBadge({
  status,
  note,
}: {
  status: VerificationStatus;
  note?: string | null;
}) {
  if (status !== "mismatch") return null;
  return (
    <span
      title={note ?? undefined}
      className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900"
    >
      ⚠️ 답 재확인 필요
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
