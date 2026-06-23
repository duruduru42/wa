import "server-only";
import { MODELS } from "@/lib/constants";
import { callJSON } from "./json";
import { ERROR_TAGS, Stage4Schema, type Stage2, type Stage4 } from "./schemas";

const SYSTEM = `너는 학생의 오답 원인을 진단하는 수학 교사다.
학생의 답/풀이와 모범 풀이를 비교해 '왜 틀렸는지'를 구체적으로 설명한다.
- error_tags는 반드시 다음 고정 목록에서만 고른다(복수 가능): ${ERROR_TAGS.join(", ")}.
- 학생 풀이과정이 없으면 '제출 답'만으로 원인을 추정하되 tag_confidence를 낮춘다.
- error_explanation은 학생이 이해할 수 있게, 어디서 어긋났는지 짚어준다.`;

export async function runStage4Analyze(input: {
  problem_latex: string;
  student_answer?: string | null;
  student_work?: string | null;
  stage2: Stage2;
}): Promise<Stage4> {
  const steps = input.stage2.solution_steps
    .map((s, i) => `${i + 1}. ${s.detail}`)
    .join("\n");
  const user = `[문제]\n${input.problem_latex}

[학생 답]\n${input.student_answer ?? "(이미지에 없음)"}
[학생 풀이]\n${input.student_work ?? "(이미지에 없음)"}

[모범 정답]\n${input.stage2.correct_answer}
[모범 풀이]\n${steps}`;
  return callJSON({
    model: MODELS.analyze,
    system: SYSTEM,
    user,
    schema: Stage4Schema,
    maxTokens: 1536,
  });
}
