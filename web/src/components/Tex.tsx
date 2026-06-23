"use client";
import katex from "katex";
import { useMemo } from "react";

// LaTeX 한 덩어리를 렌더 (앱 뷰와 PDF가 동일 경로 — 스펙 §7-1 일관성)
export function Tex({
  children,
  block = false,
}: {
  children: string;
  block?: boolean;
}) {
  const html = useMemo(
    () =>
      katex.renderToString(children ?? "", {
        throwOnError: false,
        displayMode: block,
        output: "html",
      }),
    [children, block],
  );
  return (
    <span
      className={block ? "block overflow-x-auto py-1" : "inline"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// 텍스트 중간에 $...$ 인라인 수식이 섞인 경우 렌더
export function MixedText({ children }: { children: string }) {
  const parts = useMemo(() => (children ?? "").split(/(\$[^$]*\$)/g), [children]);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("$") && p.endsWith("$") && p.length > 1 ? (
          <Tex key={i}>{p.slice(1, -1)}</Tex>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
