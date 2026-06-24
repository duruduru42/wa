import "server-only";
import { MODELS } from "@/lib/constants";
import { callJSON } from "./json";
import { ERROR_TAGS, Stage4Schema, type Stage2, type Stage4 } from "./schemas";

const SYSTEM = `너는 학생의 오답 원인을 진단하는 수학 교사다.
학생의 답/풀이와 모범 풀이를 비교해 '왜 틀렸는지'를 구체적으로 설명한다.
- error_tags는 반드시 다음 고정 목록에서만 고른다(복수 가능): ${ERROR_TAGS.join(", ")}.
- 학생 풀이과정이 없으면 '제출 답'만으로 원인을 추정하되 tag_confidence를 낮춘다.
- error_summary: 틀린 핵심 원인을 학생이 복습 때 떠올릴 수 있게 **한 문장(40자 내외)**으로. 예: "근의 부호를 반대로 적용했다.", "조건 (나)의 연속 조건을 빠뜨렸다."

error_explanation 작성 규칙(가독성 중요):
- 반드시 두괄식: 첫 줄에 핵심 원인을 한 문장으로 요약한다.
- 그 다음 빈 줄을 두고(개행 2번) 상세 설명을 이어간다.
- 틀린 지점이 여러 개면 "1) ...", "2) ..." 처럼 번호로 나누고 각 항목은 줄바꿈으로 구분한다.
- 줄바꿈은 실제 개행 문자로 넣는다(문단·항목 사이를 시각적으로 분리).
- 수식은 x^2, a_1 처럼 ^(지수)·_(아래첨자)를 쓰거나 $...$로 감싼다(앱이 위/아래첨자로 렌더한다).`;

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
    maxTokens: 2048,
  });
}
