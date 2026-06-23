import { NextResponse } from "next/server";
import { errMsg } from "@/lib/err";
import { createRLSClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json()) as {
      email: string;
      password: string;
    };
    const supabase = await createRLSClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}
