import "server-only";
import { MODELS } from "@/lib/constants";
import { callJSON } from "./json";
import { Stage1Schema, type Stage1 } from "./schemas";

const SYSTEM = `너는 중·고등 수학 문제 이미지에서 정보를 추출하는 도우미다.
이미지에는 인쇄체 문제와 학생의 손글씨 풀이/답이 섞여 있을 수 있다.
- 수식은 반드시 LaTeX로 추출한다(problem_latex). problem_plaintext에는 사람이 읽기 쉬운 평문을 넣는다.
- 학생이 적은 답(student_answer)과 풀이과정(student_work)을 별도로 구분해 추출한다. 없으면 null.
- detected_subject/detected_unit은 추정(예: "수학", "이차방정식"). 모르면 null.
- confidence는 추출 신뢰도 0~1. 손글씨가 흐리거나 수식이 모호하면 낮춘다.`;

export async function runStage1Extract(input: {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}): Promise<Stage1> {
  return callJSON({
    model: MODELS.vision,
    system: SYSTEM,
    user: [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: input.mediaType,
          data: input.imageBase64,
        },
      },
      {
        type: "text",
        text: "이 이미지에서 문제와 학생 답/풀이를 추출해 스키마대로 JSON으로 반환하라.",
      },
    ],
    schema: Stage1Schema,
    maxTokens: 2048,
  });
}
