"use client";

import { useState } from "react";

export function ExportButton({ tag }: { tag?: string }) {
  const [busy, setBusy] = useState<null | "full" | "exam">(null);
  const [err, setErr] = useState<string | null>(null);

  async function exportPdf(mode: "full" | "exam") {
    setBusy(mode);
    setErr(null);
    try {
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, tag }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `내보내기 실패 (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `오답노트-${mode === "exam" ? "시험지" : "해설포함"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <button
          onClick={() => exportPdf("full")}
          disabled={busy !== null}
          className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs disabled:opacity-40"
        >
          {busy === "full" ? "생성 중…" : "PDF · 해설포함"}
        </button>
        <button
          onClick={() => exportPdf("exam")}
          disabled={busy !== null}
          className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs disabled:opacity-40"
        >
          {busy === "exam" ? "생성 중…" : "PDF · 시험지"}
        </button>
      </div>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
