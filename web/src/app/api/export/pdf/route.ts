import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { errMsg } from "@/lib/err";

export const runtime = "nodejs";
export const maxDuration = 120;

// POST /api/export/pdf  { ids?: string[], mode?: 'full'|'exam', tag?: string }
// 앱 뷰와 동일한 KaTeX 렌더 경로(/print/notebook)를 Playwright로 PDF화 (스펙 §7-1 권장안 b).
export async function POST(req: Request) {
  let browser;
  try {
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

    browser = await chromium.launch();
    const page = await browser.newPage();
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
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}
