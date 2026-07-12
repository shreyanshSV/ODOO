import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { currentUser } from "@/lib/session";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "EcoSphere — ESG Management Platform",
  description:
    "Measure, manage and improve Environmental, Social and Governance performance across your organization.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className="font-sans">
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
