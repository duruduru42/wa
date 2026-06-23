import { NextResponse } from "next/server";
import { errMsg } from "@/lib/err";
import { requireUser, requireTenantStaff, authErrorResponse } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildParentReport } from "@/lib/report";
import { sendSms, pickChannel } from "@/lib/solapi";
import type { WrongItem } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

type Ctx = { params: Promise<{ id: string }> };

// POST /api/academy/student/[id]/report — 학부모에게 약점 리포트 발송 (Solapi)
export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const supa = createAdminClient();
  try {
    const user = await requireUser();
    const { data: student, error: sErr } = await supa
      .from("students")
      .select("id, name, tenant_id")
      .eq("id", id)
      .maybeSingle<{ id: string; name: string; tenant_id: string }>();
    if (sErr) throw sErr;
    if (!student) return NextResponse.json({ error: "학생 없음" }, { status: 404 });
    // 해당 학원의 교사/관리자만 리포트 발송 가능
    await requireTenantStaff(supa, student.tenant_id, user.id);

    const [{ data: tenant }, { data: itemRows }, { data: parentRows }] =
      await Promise.all([
        supa.from("tenants").select("name").eq("id", student.tenant_id).maybeSingle(),
        supa.from("wrong_items").select("*").eq("student_id", id),
        supa
          .from("parent_links")
          .select("memberships!inner(display_name, phone, role)")
          .eq("student_id", id),
      ]);

    const items = (itemRows ?? []) as WrongItem[];
    type M = { display_name: string | null; phone: string | null; role: string };
    const parent = (parentRows ?? [])
      .flatMap((r) => {
        const m = (r as { memberships: M | M[] }).memberships;
        return Array.isArray(m) ? m : [m];
      })
      .find((m) => m?.role === "parent");

    const body = buildParentReport({
      academyName: tenant?.name ?? "학원",
      studentName: student.name,
      items,
    });
    const channel = pickChannel(body);

    let status: "sent" | "mock" | "failed";
    let providerRef: string | null;
    let note: string;
    if (parent?.phone) {
      const res = await sendSms({ to: parent.phone, text: body });
      status = res.status;
      providerRef = res.providerRef;
      note = res.note;
    } else {
      status = "mock";
      providerRef = null;
      note = "학부모 연락처 미등록 — 발송 생략(모크)";
    }

    const { data: saved, error: insErr } = await supa
      .from("parent_reports")
      .insert({
        tenant_id: student.tenant_id,
        student_id: id,
        channel,
        to_label: parent?.display_name ?? "학부모(미등록)",
        to_phone: parent?.phone ?? null,
        body,
        status,
        provider_ref: providerRef,
      })
      .select("*")
      .single();
    if (insErr) throw insErr;

    return NextResponse.json({ status, note, channel, body, report: saved });
  } catch (e) {
    const a = authErrorResponse(e);
    if (a) return NextResponse.json({ error: a.error }, { status: a.status });
    return NextResponse.json({ error: errMsg(e) }, { status: 500 });
  }
}
