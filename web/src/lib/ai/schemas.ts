import { z } from "zod";

// 통계 집계를 위한 고정 enum (스펙 §3 Stage 4)
export const ERROR_TAGS = [
  "개념이해부족",
  "계산실수",
  "조건누락",
  "문제오독",
  "공식오적용",
  "단위/표기",
  "풀이미완성",
  "시간부족(추정)",
] as const;
export const ErrorTag = z.enum(ERROR_TAGS);

const SolutionStep = z.object({
  step: z.number().int().optional(),
  title: z.string().optional(),
  detail: z.string(), // 설명 (LaTeX 허용)
});
export type SolutionStep = z.infer<typeof SolutionStep>;

// --- Stage 1: 추출 (Vision) ---
export const Stage1Schema = z.object({
  problem_latex: z.string(),
  problem_plaintext: z.string(),
  student_answer: z.string().nullable().default(null),
  student_work: z.string().nullable().default(null),
  detected_subject: z.string().nullable().default(null),
  detected_unit: z.string().nullable().default(null),
  confidence: z.number().min(0).max(1),
});
export type Stage1 = z.infer<typeof Stage1Schema>;

// --- Stage 2: 정답 & 모범 풀이 ---
export const Stage2Schema = z.object({
  correct_answer: z.string(),
  solution_steps: z.array(SolutionStep).min(1),
  key_concepts: z.array(z.string()).default([]),
  difficulty: z.number().int().min(1).max(5),
});
export type Stage2 = z.infer<typeof Stage2Schema>;

// --- Stage 3: 검산 ---
export const VerificationStatus = z.enum([
  "verified",
  "mismatch",
  "unverifiable",
]);
export const Stage3Schema = z.object({
  verification_status: VerificationStatus,
  verification_note: z.string(),
});
export type Stage3 = z.infer<typeof Stage3Schema>;

// verifier(sympy) 서비스 응답
export const VerifierResultSchema = z.object({
  ok: z.boolean(), // sympy가 해석/계산에 성공했는가
  match: z.boolean().nullable(), // 모범답안과 일치 여부 (ok일 때만 의미)
  computed: z.string().nullable(),
  note: z.string(),
});
export type VerifierResult = z.infer<typeof VerifierResultSchema>;

// --- Stage 4: 오답 원인 분석 ---
export const Stage4Schema = z.object({
  error_explanation: z.string(),
  error_tags: z.array(ErrorTag).min(1),
  tag_confidence: z.number().min(0).max(1),
});
export type Stage4 = z.infer<typeof Stage4Schema>;

// --- Stage 5: 유사문제 생성 (1개) ---
export const VariantSchema = z.object({
  variant_problem_latex: z.string(),
  generated_answer: z.string(),
  generated_solution_steps: z.array(SolutionStep).min(1),
  difficulty: z.number().int().min(1).max(5),
});
export const Stage5Schema = z.object({
  variants: z.array(VariantSchema).min(1),
});
export type Variant = z.infer<typeof VariantSchema>;
export type Stage5 = z.infer<typeof Stage5Schema>;
