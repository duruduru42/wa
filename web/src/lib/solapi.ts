import "server-only";
import crypto from "node:crypto";

export interface SendResult {
  status: "sent" | "mock" | "failed";
  providerRef: string | null;
  note: string;
}

// SMS 90바이트 초과 시 LMS로 분류 (한글 2~3바이트)
export function pickChannel(text: string): "sms" | "lms" {
  return Buffer.byteLength(text, "utf8") <= 90 ? "sms" : "lms";
}

/**
 * Solapi 발송 (스펙 §10). SOLAPI_API_KEY/SECRET 미설정 시 모크 발송.
 * booking_rest의 모크 패턴 재사용 — 키 없이도 전체 흐름 검증 가능.
 */
export async function sendSms(opts: {
  to: string;
  from?: string;
  text: string;
}): Promise<SendResult> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const from = opts.from ?? process.env.SOLAPI_SENDER ?? "";

  if (!apiKey || !apiSecret || !from) {
    return {
      status: "mock",
      providerRef: `mock-${crypto.randomUUID()}`,
      note: "Solapi 키/발신번호 미설정 — 모크 발송 (실제 미전송)",
    };
  }

  try {
    const date = new Date().toISOString();
    const salt = crypto.randomBytes(16).toString("hex");
    const signature = crypto
      .createHmac("sha256", apiSecret)
      .update(date + salt)
      .digest("hex");
    const res = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
      },
      body: JSON.stringify({
        message: {
          to: opts.to.replace(/-/g, ""),
          from: from.replace(/-/g, ""),
          text: opts.text,
          type: pickChannel(opts.text).toUpperCase(),
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const json = (await res.json()) as { messageId?: string };
    if (!res.ok) {
      return { status: "failed", providerRef: null, note: JSON.stringify(json) };
    }
    return {
      status: "sent",
      providerRef: json.messageId ?? null,
      note: "Solapi 발송 완료",
    };
  } catch (e) {
    return { status: "failed", providerRef: null, note: String(e) };
  }
}
