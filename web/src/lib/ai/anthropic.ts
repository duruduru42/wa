import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.startsWith("sk-ant-xxxx")) {
      throw new Error(
        "ANTHROPIC_API_KEY 미설정: web/.env.local 에 실제 키를 넣어주세요.",
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}
