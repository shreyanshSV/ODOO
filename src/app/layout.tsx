import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "EcoSphere — ESG Management Platform",
  description:
    "Measure, manage and improve Environmental, Social and Governance performance across your organization.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  return (
    <html lang="en">
      <body>
        {user ? (
          <div className="flex min-h-screen">
            <Sidebar user={{ name: user.name ?? user.email ?? "User", email: user.email ?? "", role: user.role }} />
            <main className="min-w-0 flex-1">{children}</main>
          </div>
        ) : (
          // unauthenticated routes (e.g. /login) render without app chrome
          children
        )}
      </body>
    </html>
  );
}
