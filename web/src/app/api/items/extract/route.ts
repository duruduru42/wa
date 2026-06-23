import { NextResponse } from "next/server";
import { errMsg } from "@/lib/err";
import { requireUser, authErrorResponse } from "@/lib/auth";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { runStage1Extract } from "@/lib/ai/stage1-extract";
import {
  DEFAULT_NOTEBOOK_ID,
  DEFAULT_STUDENT_ID,
  IMAGE_BUCKET,
  MODEL_VERSION_TAG,
} from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

type MediaType = "image/jpeg" | "image/png" | "image/webp";

const EXT: Record<MediaType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// POST /api/items/extract  { imageBase64, mediaType }
// Stage 1(추출) 단독 실행 → 사용자 확인/교정 단계로 넘긴다.
export async function POST(req: Request) {
  try {
    await requireUser();
    const { imageBase64, mediaType } = (await req.json()) as {
      imageBase64: string;
      mediaType: MediaType;
    };
    if (!imageBase64 || !EXT[mediaType]) {
      return NextResponse.json(
        { error: "imageBase64/mediaType 필요(jpeg|png|webp)" },
        { status: 400 },
      );
    }

    const buf = Buffer.from(imageBase64, "base64");
    const hash = crypto.createHash("sha256").update(buf).digest("hex");
    const supa = createAdminClient();

    // 동일 이미지 중복 분석 방지 (스펙 §7-5)
    const { data: dup } = await supa
      .from("wrong_items")
      .select("id")
      .eq("student_id", DEFAULT_STUDENT_ID)
      .eq("image_hash", hash)
      .maybeSingle();
    if (dup) {
      return NextResponse.json({ id: dup.id, duplicate: true });
    }

    // 이미지 업로드
    const path = `${DEFAULT_STUDENT_ID}/${hash}.${EXT[mediaType]}`;
    await supa.storage
      .from(IMAGE_BUCKET)
      .upload(path, buf, { contentType: mediaType, upsert: true });
    const {
      data: { publicUrl },
    } = supa.storage.from(IMAGE_BUCKET).getPublicUrl(path);

    // Stage 1
    const s1 = await runStage1Extract({ imageBase64, mediaType });

    const { data, error } = await supa
      .from("wrong_items")
      .insert({
        notebook_id: DEFAULT_NOTEBOOK_ID,
        student_id: DEFAULT_STUDENT_ID,
        source_image_url: publicUrl,
        image_hash: hash,
        problem_latex: s1.problem_latex,
        problem_text: s1.problem_plaintext,
        student_answer: s1.student_answer,
        student_work: s1.student_work,
        detected_subject: s1.detected_subject,
        detected_unit: s1.detected_unit,
        extract_confidence: s1.confidence,
        subject: s1.detected_subject,
        unit: s1.detected_unit,
        status: "extracted",
        model_version: MODEL_VERSION_TAG,
      })
      .select("id")
      .single();
    if (error) throw error;

    return NextResponse.json({ id: data.id, stage1: s1 });
  } catch (e) {
    const a = authErrorResponse(e);
    if (a) return NextResponse.json({ error: a.error }, { status: a.status });
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}
