// Phase 1 단일 사용자 고정값 (supabase/seed.sql 과 일치)
export const DEFAULT_STUDENT_ID = "00000000-0000-0000-0000-000000000001";
export const DEFAULT_NOTEBOOK_ID = "00000000-0000-0000-0000-000000000010";

export const IMAGE_BUCKET = "item-images";

// Phase 3 데모 학원 테넌트 (supabase/_seed_academy.sql). 실제로는 auth 세션의 멤버십에서 결정.
export const DEMO_ACADEMY_ID = "00000000-0000-0000-0000-0000000000b0";

// 스테이지별 모델 라우팅 (스펙 §3 공통: 비용 통제)
// 정답·검산·생성은 상위 모델, 단순 분류는 저가 모델.
export const MODELS = {
  vision: "claude-sonnet-4-6", // Stage 1 추출(이미지→LaTeX)
  solve: "claude-sonnet-4-6", // Stage 2 정답·풀이 (필요 시 claude-opus-4-8 로 상향)
  verify: "claude-sonnet-4-6", // Stage 3 서술형 2차 검증
  analyze: "claude-sonnet-4-6", // Stage 4 오답 원인 분석
  variant: "claude-sonnet-4-6", // Stage 5 유사문제 생성
  cheap: "claude-haiku-4-5", // 간단 분류용
} as const;

export const MODEL_VERSION_TAG = "p1-2026-06";
