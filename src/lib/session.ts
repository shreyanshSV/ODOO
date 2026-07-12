import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  companyId: string | null;
};

/** The signed-in user (or null). Server components / actions only. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  return (session?.user as SessionUser | undefined) ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

/** Require one of the given roles; otherwise bounce home. */
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const u = await requireUser();
  if (!roles.includes(u.role)) redirect("/");
  return u;
}

/** Active company for tenant-scoped queries. Super admins may have none. */
export async function currentCompanyId(): Promise<string | null> {
  const u = await currentUser();
  return u?.companyId ?? null;
}
