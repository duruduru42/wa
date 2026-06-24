"use client";
import katex from "katex";
import { Fragment, useMemo } from "react";
import { latexSymbols } from "@/lib/latex";

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

// 평문에서 ^지수 / _아래첨자 를 sup/sub 로 변환 (x^2 → x², a_1 → a₁)
function supSubNodes(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let buf = "";
  let i = 0;
  let k = 0;
  const flush = () => {
    if (buf) {
      out.push(buf);
      buf = "";
    }
  };
  while (i < text.length) {
    const c = text[i];
    if ((c === "^" || c === "_") && i + 1 < text.length) {
      flush();
      let content = "";
      if (text[i + 1] === "{") {
        const end = text.indexOf("}", i + 2);
        if (end === -1) {
          content = text.slice(i + 1);
          i = text.length;
        } else {
          content = text.slice(i + 2, end);
          i = end + 1;
        }
      } else {
        const m = text.slice(i + 1).match(/^[0-9]+|^[A-Za-z]/);
        content = m ? m[0] : text[i + 1];
        i += 1 + content.length;
      }
      out.push(
        c === "^" ? (
          <sup key={`${keyBase}-${k++}`}>{content}</sup>
        ) : (
          <sub key={`${keyBase}-${k++}`}>{content}</sub>
        ),
      );
    } else {
      buf += c;
      i++;
    }
  }
  flush();
  return out;
}

// 한 줄 렌더: $...$ 는 KaTeX, 나머지는 sup/sub 처리
function renderSegment(seg: string, keyBase: string): React.ReactNode {
  const parts = seg.split(/(\$[^$]*\$)/g);
  return parts.map((p, i) =>
    p.startsWith("$") && p.endsWith("$") && p.length > 1 ? (
      <Tex key={`${keyBase}-t${i}`}>{p.slice(1, -1)}</Tex>
    ) : (
      <Fragment key={`${keyBase}-s${i}`}>
        {supSubNodes(latexSymbols(p), `${keyBase}-${i}`)}
      </Fragment>
    ),
  );
}

// 텍스트 렌더: 리터럴 \n·실제 개행 → 줄바꿈, $...$ 수식, ^지수/_첨자 가독화
export function MixedText({ children }: { children: string }) {
  const lines = useMemo(
    () => (children ?? "").replace(/\\n/g, "\n").split("\n"),
    [children],
  );
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {renderSegment(line, `l${i}`)}
        </Fragment>
      ))}
    </>
  );
}
