import { NextResponse } from "next/server";
import { createRLSClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createRLSClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
