"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-ghost">
      <Printer size={14} /> Export PDF
    </button>
  );
}
