import { NextResponse } from "next/server";
import { errMsg } from "@/lib/err";
import { requireUser, authErrorResponse } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

// Playwright는 동적 임포트 — 서버리스(Vercel 등 chromium 미설치) 환경에서
// 빌드/모듈 부재로 깨지지 않게 가드한다.
async function getChromium() {
  try {
    const pw = await import("playwright");
    return pw.chromium;
  } catch {
    return null;
  }
}

// POST /api/export/pdf  { ids?: string[], mode?: 'full'|'exam', tag?: string }
// 앱 뷰와 동일한 KaTeX 렌더 경로(/print/notebook)를 Playwright로 PDF화 (스펙 §7-1 권장안 b).
// Playwright는 세션 쿠키가 없으므로, 호출자(로그인 사용자)의 쿠키를 컨텍스트에 주입해
// /print/notebook 이 본인 오답만 렌더하도록 한다(per-user 격리).
export async function POST(req: Request) {
  let browser;
  try {
    await requireUser();
    const chromium = await getChromium();
    if (!chromium) {
      return NextResponse.json(
        { error: "이 환경에서는 PDF 내보내기를 지원하지 않습니다(서버리스)." },
        { status: 503 },
      );
    }
    const body = (await req.json().catch(() => ({}))) as {
      ids?: string[];
      mode?: "full" | "exam";
      tag?: string;
    };
    const origin = new URL(req.url).origin;
    const params = new URLSearchParams();
    params.set("mode", body.mode ?? "full");
    if (body.ids?.length) params.set("ids", body.ids.join(","));
    if (body.tag) params.set("tag", body.tag);
    const printUrl = `${origin}/print/notebook?${params.toString()}`;

    // 들어온 요청의 쿠키를 그대로 Playwright 컨텍스트로 전달 (세션 위임)
    const cookieHeader = req.headers.get("cookie") ?? "";
    const cookies = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const eq = c.indexOf("=");
        return { name: c.slice(0, eq), value: c.slice(eq + 1), url: origin };
      })
      .filter((c) => c.name);

    try {
      browser = await chromium.launch();
    } catch {
      return NextResponse.json(
        { error: "이 환경에서는 PDF 내보내기를 지원하지 않습니다(브라우저 미설치)." },
        { status: 503 },
      );
    }
    const context = await browser.newContext();
    if (cookies.length) await context.addCookies(cookies);
    const page = await context.newPage();
    await page.goto(printUrl, { waitUntil: "networkidle", timeout: 60000 });
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" },
    });
    await browser.close();

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="notebook-${body.mode ?? "full"}.pdf"`,
      },
    });
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    const a = authErrorResponse(e);
    if (a) return NextResponse.json({ error: a.error }, { status: a.status });
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}
