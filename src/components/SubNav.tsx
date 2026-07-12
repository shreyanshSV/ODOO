"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SubNav({ items }: { items: { label: string; href: string }[] }) {
  const pathname = usePathname();
  return (
    <div className="mb-5 inline-flex flex-wrap gap-1 rounded-xl border border-border bg-panel2 p-1 shadow-inset">
      {items.map((it) => {
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-overall/40 ${
              active ? "bg-panel text-ink shadow-soft" : "text-faint hover:bg-panel/50 hover:text-ink"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
