import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "./anthropic";

type UserContent = string | Anthropic.ContentBlockParam[];

interface CallOpts<T extends z.ZodTypeAny> {
  model: string;
  system: string;
  user: UserContent;
  schema: T;
  maxTokens?: number;
  temperature?: number;
}

/**
 * 구조화 JSON 호출 (스펙 §3 공통). 어시스턴트 prefill 대신 구조화 출력
 * (output_config.format)을 사용한다 — claude-sonnet-4-6 등 4.6+ 모델은 prefill을
 * 지원하지 않으므로(400). 스키마는 SDK가 검증, 실패 시 1회 재시도.
 */
export async function callJSON<T extends z.ZodTypeAny>(
  opts: CallOpts<T>,
): Promise<z.infer<T>> {
  const { model, system, user, schema, maxTokens = 2048, temperature = 0 } =
    opts;
  const userContent: Anthropic.ContentBlockParam[] =
    typeof user === "string" ? [{ type: "text", text: user }] : user;

  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const content: Anthropic.ContentBlockParam[] =
      attempt === 0
        ? userContent
        : [
            ...userContent,
            {
              type: "text",
              text: `직전 응답이 스키마 검증에 실패했다(${String(
                lastErr,
              )}). 스키마를 정확히 지켜 다시 출력하라.`,
            },
          ];

    try {
      const res = await anthropic().messages.parse({
        model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: "user", content }],
        output_config: { format: zodOutputFormat(schema) },
      });
      if (res.parsed_output != null) return res.parsed_output;
      lastErr = new Error(
        `구조화 출력 없음 (stop_reason=${res.stop_reason ?? "?"})`,
      );
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`구조화 JSON 파싱/검증 실패(2회): ${String(lastErr)}`);
}
