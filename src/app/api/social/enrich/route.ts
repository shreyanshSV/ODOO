import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { getAIProvider } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const user = await currentUser();
  if (!user || !["SUPER_ADMIN", "COMPANY_ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { name?: string; domain?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "company name required" }, { status: 400 });

  try {
    const result = await getAIProvider().enrichCompany({ name, domain: body.domain?.trim() || undefined });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "enrichment failed" }, { status: 500 });
  }
}
