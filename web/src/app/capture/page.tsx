"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Tex } from "@/components/Tex";
import { Card } from "@/components/ui";
import type { Stage1 } from "@/lib/ai/schemas";

type Phase = "idle" | "crop" | "extracting" | "review" | "analyzing";
type Rect = { x: number; y: number; w: number; h: number };

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"] as const;

export default function CapturePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [imgSrc, setImgSrc] = useState<string | null>(null); // crop 대상
  const [origMedia, setOrigMedia] = useState<string>("image/jpeg");
  const [usedImg, setUsedImg] = useState<string | null>(null); // 분석에 쓴 이미지
  const [itemId, setItemId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Stage1 | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const boxRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [sel, setSel] = useState<Rect | null>(null);
  const drawing = useRef<{ x: number; y: number } | null>(null);

  function readFile(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  async function onFile(file: File) {
    setErr(null);
    setSel(null);
    setOrigMedia(
      (ACCEPTED as readonly string[]).includes(file.type)
        ? file.type
        : "image/jpeg",
    );
    setImgSrc(await readFile(file));
    setPhase("crop");
  }

  function pos(e: React.PointerEvent) {
    const rect = boxRef.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max(e.clientX - rect.left, 0), rect.width),
      y: Math.min(Math.max(e.clientY - rect.top, 0), rect.height),
    };
  }
  function onDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pos(e);
    drawing.current = p;
    setSel({ x: p.x, y: p.y, w: 0, h: 0 });
  }
  function onMove(e: React.PointerEvent) {
    if (!drawing.current) return;
    const p = pos(e);
    const s = drawing.current;
    setSel({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    });
  }
  function onUp() {
    drawing.current = null;
    setSel((s) => (s && (s.w < 12 || s.h < 12) ? null : s));
  }

  async function runExtract(base64: string, mediaType: string) {
    setPhase("extracting");
    setErr(null);
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
      setPhase("crop");
    }
  }

  function useFull() {
    if (!imgSrc) return;
    setUsedImg(imgSrc);
    runExtract(imgSrc.split(",")[1], origMedia);
  }

  function useCrop() {
    const img = imgRef.current,
      box = boxRef.current;
    if (!img || !box || !sel) return;
    const rect = box.getBoundingClientRect();
    const sx = (sel.x / rect.width) * img.naturalWidth;
    const sy = (sel.y / rect.height) * img.naturalHeight;
    const sw = (sel.w / rect.width) * img.naturalWidth;
    const sh = (sel.h / rect.height) * img.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setUsedImg(dataUrl);
    runExtract(dataUrl.split(",")[1], "image/jpeg");
  }

  async function analyze() {
    if (!itemId || !draft) return;
    setPhase("analyzing");
    setErr(null);
    try {
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
      const res = await fetch(`/api/items/${itemId}/analyze`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "분석 실패");
      router.push(`/item/${itemId}`);
    } catch (e) {
      setErr(String(e));
      setPhase("review");
    }
  }

  function reset() {
    setPhase("idle");
    setImgSrc(null);
    setSel(null);
    setUsedImg(null);
    setItemId(null);
    setDraft(null);
    setErr(null);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">새 오답 등록</h1>

      {phase === "idle" && (
        <Card className="space-y-3">
          <p className="text-sm text-muted">
            틀린 문제를 촬영하거나 사진을 선택하세요. 여러 문제가 같이 찍혀도
            다음 단계에서 한 문제만 잘라낼 수 있습니다.
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

      {phase === "crop" && imgSrc && (
        <div className="space-y-3">
          <Card className="space-y-2">
            <p className="text-sm text-muted">
              분석할 <b>한 문제 영역을 손가락으로 드래그</b>해 박스로 선택하세요.
              전체를 쓰려면 아래 버튼을 누르세요.
            </p>
            <div
              ref={boxRef}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              className="relative w-full touch-none select-none overflow-hidden rounded-xl border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imgSrc}
                alt="선택할 문제 사진"
                draggable={false}
                className="block w-full"
              />
              {sel && (
                <div
                  className="pointer-events-none absolute border-2 border-primary bg-primary/20"
                  style={{ left: sel.x, top: sel.y, width: sel.w, height: sel.h }}
                />
              )}
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={useCrop}
              disabled={!sel}
              className="rounded-lg bg-primary py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              선택 영역 분석
            </button>
            <button
              onClick={useFull}
              className="rounded-lg border border-border bg-card py-3 text-sm font-medium"
            >
              전체 사진 분석
            </button>
          </div>
          <button onClick={reset} className="w-full text-xs text-muted underline">
            다른 사진 선택
          </button>
        </div>
      )}

      {usedImg && (phase === "review" || phase === "analyzing") && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={usedImg}
          alt="분석 대상"
          className="max-h-56 w-full rounded-xl border border-border object-contain"
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

      {err && <Card className="text-sm text-red-600">오류: {err}</Card>}

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
