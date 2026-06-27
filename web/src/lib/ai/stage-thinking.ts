import "server-only";
import { MODELS } from "@/lib/constants";
import { callJSON } from "./json";
import { ThinkingSchema, type Stage2, type Thinking } from "./schemas";

// 모드 C: 비슷한 문제를 '풀게' 하지 않고, 조건 해석 → 식 세우기까지의 '사고'를 단계별로 유도.
// 폰에서 계산은 부담 → 생각하는 법(조건을 식으로 옮기는 과정)을 훈련.
const SYSTEM = `너는 학생의 '수학적 사고력'을 길러주는 코치다.
원문제와 '동일 개념/유형'의 비슷한 문제를 하나 만들고, 그 문제를 **직접 풀지 말고**
'어떻게 생각해서 식을 세우는지'를 단계별로 안내한다(계산은 하지 않는다 — 폰 학습용).

규칙:
- variant_problem_latex: 원문제와 같은 개념의 비슷한 문제(수식은 $...$).
- thinking_steps: 문제의 조건/단계마다 하나씩. 각 step은:
  - label: 그 조건/단계 이름 (예: "조건 (가)", "1단계: 미지수 정하기").
  - prompt: 학생 스스로 생각하도록 던지는 짧은 질문 (예: "이 조건은 그래프의 무엇을 뜻할까? 식으로 어떻게 쓸까?").
  - guide: 모범 사고 — 그 조건이 의미하는 바와 '세워야 할 식'까지만. **최종 계산/정답은 쓰지 않는다.**
- 마지막 step은 "이제 무엇을 구하면 되는지(어떤 식을 연립/정리하면 되는지)"로 마무리하되, 답은 내지 않는다.
- 수식은 $...$로 감싼다.`;

export async function runThinkingScaffold(input: {
  problem_latex: string;
  stage2: Stage2;
}): Promise<Thinking> {
  const concepts = input.stage2.key_concepts.join(", ");
  const user = `[원문제]\n${input.problem_latex}
[원문제 핵심 개념]\n${concepts}
[원문제 난이도]\n${input.stage2.difficulty}

위와 같은 개념의 비슷한 문제 1개와, 그 문제의 '식 세우기 사고 과정'을 단계별로 만들어라(계산 제외).`;
  return callJSON({
    model: MODELS.variant,
    system: SYSTEM,
    user,
    schema: ThinkingSchema,
    maxTokens: 4096,
    temperature: 0.4,
  });
}
