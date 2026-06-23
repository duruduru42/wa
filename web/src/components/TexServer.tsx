import katex from "katex";
import { Fragment } from "react";

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

function supSubServer(text: string, kb: string): React.ReactNode[] {
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
          <sup key={`${kb}-${k++}`}>{content}</sup>
        ) : (
          <sub key={`${kb}-${k++}`}>{content}</sub>
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

export function MixedTextServer({ children }: { children: string }) {
  const lines = (children ?? "").replace(/\\n/g, "\n").split("\n");
  return (
    <>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {line.split(/(\$[^$]*\$)/g).map((p, i) =>
            p.startsWith("$") && p.endsWith("$") && p.length > 1 ? (
              <TexServer key={`${li}-t${i}`}>{p.slice(1, -1)}</TexServer>
            ) : (
              <Fragment key={`${li}-s${i}`}>
                {supSubServer(p, `${li}-${i}`)}
              </Fragment>
            ),
          )}
        </Fragment>
      ))}
    </>
  );
}
