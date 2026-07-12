"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SubNav({ items }: { items: { label: string; href: string }[] }) {
  const pathname = usePathname();
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {items.map((it) => {
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              active
                ? "border-border bg-panel2 text-ink"
                : "border-transparent text-faint hover:text-ink"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
