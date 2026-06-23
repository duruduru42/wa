import katex from "katex";

// 서버 렌더 KaTeX — PDF용 print 페이지에서 클라이언트 JS 없이 즉시 수식 표시.
// 앱 뷰(Tex.tsx)와 동일한 katex 출력 → 렌더 일관성 (스펙 §7-1).
export function TexServer({
  children,
  block = false,
}: {
  children: string;
  block?: boolean;
}) {
  const html = katex.renderToString(children ?? "", {
    throwOnError: false,
    displayMode: block,
    output: "html",
  });
  return (
    <span
      className={block ? "katex-block" : "katex-inline"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function MixedTextServer({ children }: { children: string }) {
  const parts = (children ?? "").split(/(\$[^$]*\$)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("$") && p.endsWith("$") && p.length > 1 ? (
          <TexServer key={i}>{p.slice(1, -1)}</TexServer>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
