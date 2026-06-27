import type { SolutionStep } from "@/lib/ai/schemas";

export type VerificationStatus =
  | "pending"
  | "verified"
  | "mismatch"
  | "unverifiable";
export type ItemStatus = "extracted" | "solved" | "analyzed" | "done" | "error";

export interface WrongItem {
  id: string;
  notebook_id: string | null;
  student_id: string;

  source_image_url: string | null;
  image_hash: string | null;
  problem_latex: string | null;
  problem_text: string | null;
  student_answer: string | null;
  student_work: string | null;
  detected_subject: string | null;
  detected_unit: string | null;
  extract_confidence: number | null;

  correct_answer: string | null;
  solution_steps: SolutionStep[];
  key_concepts: string[];
  difficulty: number | null;

  verification_status: VerificationStatus;
  verification_note: string | null;

  error_summary: string | null;
  error_explanation: string | null;
  error_tags: string[];
  tag_confidence: number | null;
  student_reason: string | null;
  student_tags: string[];
  reviewed_at: string | null;
  review_due_at: string | null;
  review_interval: number;
  review_ease: number;
  review_reps: number;

  subject: string | null;
  unit: string | null;
  source_textbook: string | null;
  source_page: string | null;
  status: ItemStatus;
  model_version: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attempt {
  id: string;
  generated_problem_id: string;
  student_id: string;
  submitted_answer: string | null;
  is_correct: boolean | null;
  grade_method: "sympy" | "llm" | "unknown" | null;
  grade_note: string | null;
  created_at: string;
}

export interface ThinkingStep {
  label: string;
  prompt: string;
  guide: string;
}

export interface GeneratedProblem {
  id: string;
  wrong_item_id: string;
  mode: "A" | "B" | "C";
  variant_latex: string;
  generated_answer: string | null;
  generated_solution: SolutionStep[];
  thinking_steps?: ThinkingStep[];
  difficulty: number | null;
  verified: boolean;
  verification_note: string | null;
  model_version: string | null;
  created_at: string;
}
