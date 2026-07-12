import { prisma } from "@/lib/prisma";
import { SETTINGS_TABS } from "@/lib/nav";
import { ModuleTabs, PageHeader, Table } from "@/components/ui";
import { SubNav } from "@/components/SubNav";
import { fmtDate, titleCase } from "@/lib/format";
import { markAllRead } from "../actions";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { employee: true },
  });

  return (
    <div className="p-6">
      <PageHeader
        title="Settings: Notifications"
        subtitle="Recent alerts across the platform"
        accent="text-ink"
        actions={
          <form action={markAllRead}>
            <button className="btn-ghost">Mark all read</button>
          </form>
        }
      />
      <ModuleTabs active="Settings" />
      <SubNav items={SETTINGS_TABS} />

      <Table head={["Time", "Type", "Title", "Message", "Read"]}>
        {notifications.map((n) => (
          <tr key={n.id}>
            <td className="td">{fmtDate(n.createdAt)}</td>
            <td className="td">{titleCase(n.type)}</td>
            <td className="td text-ink">{n.title}</td>
            <td className="td">{n.message}</td>
            <td className="td">
              {n.read ? (
                <span className="text-faint">Read</span>
              ) : (
                <span className="text-warn">Unread</span>
              )}
            </td>
          </tr>
        ))}
        {notifications.length === 0 && (
          <tr>
            <td className="td text-faint" colSpan={5}>
              No notifications yet.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}
