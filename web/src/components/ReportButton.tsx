"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReportButton({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    status: string;
    note: string;
    channel: string;
    body: string;
  } | null>(null);

  async function send() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/academy/student/${studentId}/report`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "발송 실패");
      setResult(json);
      router.refresh();
    } catch (e) {
      setResult({ status: "failed", note: String(e), channel: "-", body: "" });
    } finally {
      setBusy(false);
    }
  }

  const badge =
    result?.status === "sent"
      ? "bg-green-100 text-green-800"
      : result?.status === "mock"
        ? "bg-amber-100 text-amber-900"
        : "bg-red-100 text-red-700";

  return (
    <div className="space-y-2">
      <button
        onClick={send}
        disabled={busy}
        className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {busy ? "발송 중…" : "학부모 리포트 발송"}
      </button>
      {result && (
        <div className="space-y-1 rounded-lg border border-border bg-card p-3 text-sm">
          <span className={`rounded-full px-2 py-0.5 text-xs ${badge}`}>
            {result.status === "sent"
              ? "✅ 발송"
              : result.status === "mock"
                ? "🧪 모크"
                : "⚠️ 실패"}{" "}
            · {result.channel.toUpperCase()}
          </span>
          <p className="text-xs text-muted">{result.note}</p>
          {result.body && (
            <pre className="whitespace-pre-wrap rounded bg-background p-2 text-xs">
              {result.body}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
