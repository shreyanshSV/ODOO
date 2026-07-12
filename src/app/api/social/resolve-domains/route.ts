import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { resolveDomains } from "@/lib/social/domain-resolver";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // external lookups can take a while

export async function POST(req: Request): Promise<Response> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { names?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const names = (body.names ?? []).map((n) => String(n).trim()).filter(Boolean).slice(0, 100);
  if (!names.length) return NextResponse.json({ error: "no company names provided" }, { status: 400 });

  const results = await resolveDomains(names, 6);
  return NextResponse.json({ count: results.length, results });
}
