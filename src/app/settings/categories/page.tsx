import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SETTINGS_TABS, CATEGORY_TYPES } from "@/lib/nav";
import { Card, ModuleTabs, PageHeader, Pill, Table } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { titleCase } from "@/lib/format";
import { createCategory, deleteCategory } from "../actions";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="p-6">
      <PageHeader
        title="Settings: Categories"
        subtitle="Tags for CSR activities and challenges"
        accent="text-ink"
      />
      <ModuleTabs active="Settings" />
      <SubNav items={SETTINGS_TABS} />

      <Card title="Add Category" className="mb-4">
        <form action={createCategory} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input name="name" required className="input" placeholder="Community Outreach" />
          </div>
          <div>
            <label className="label">Type</label>
            <select name="type" className="input">
              {CATEGORY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {titleCase(t)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-primary">Add Category</button>
          </div>
        </form>
      </Card>

      <Table head={["Name", "Type", "Status", ""]}>
        {categories.map((c) => (
          <tr key={c.id}>
            <td className="td text-ink">{c.name}</td>
            <td className="td">{titleCase(c.type)}</td>
            <td className="td">
              <Pill value={c.status} />
            </td>
            <td className="td text-right">
              <form action={deleteCategory}>
                <input type="hidden" name="id" value={c.id} />
                <button className="text-faint hover:text-danger" aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </form>
            </td>
          </tr>
        ))}
        {categories.length === 0 && (
          <tr>
            <td className="td text-faint" colSpan={4}>
              No categories yet — add one above.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
