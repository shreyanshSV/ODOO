"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "company";

const asList = (fd: FormData, key: string): string[] => {
  try {
    const arr = JSON.parse(String(fd.get(key) ?? "[]"));
    return Array.isArray(arr) ? arr.map((s) => String(s).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const str = (fd: FormData, key: string) => {
  const v = String(fd.get(key) ?? "").trim();
  return v || null;
};

export async function createCompanyWorkspace(fd: FormData) {
  await requireRole(["SUPER_ADMIN", "COMPANY_ADMIN"]);

  const name = String(fd.get("name") ?? "").trim();
  if (!name) return;

  const departments = asList(fd, "departments");
  const csrCategories = asList(fd, "csrCategories");
  const goals = asList(fd, "goals");

  // unique slug
  const base = slugify(name);
  let slug = base;
  for (let n = 2; await prisma.company.findUnique({ where: { slug } }); n++) slug = `${base}-${n}`;

  const company = await prisma.company.create({
    data: {
      name,
      slug,
      domain: str(fd, "domain"),
      website: str(fd, "website"),
      logoUrl: str(fd, "logoUrl"),
      industry: str(fd, "industry"),
      headquarters: str(fd, "headquarters"),
      description: str(fd, "description"),
      csrCategories,
      goals,
    },
  });

  // create tenant-scoped departments (Department.code is globally unique → prefix with slug)
  const code = (d: string, i: number) => `${slug}-${(d.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "DPT")}${i}`;
  for (let i = 0; i < departments.length; i++) {
    await prisma.department.create({ data: { name: departments[i], code: code(departments[i], i), companyId: company.id } });
  }

  redirect("/social/csr");
}
