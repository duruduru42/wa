// 로딩 스켈레톤 — 탭 즉시 표시되어 체감 속도 향상(원격 SSR 대기 가림)
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="h-6 w-32 animate-pulse rounded bg-card" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-border bg-card"
          />
        ))}
      </div>
    </div>
  );
}
