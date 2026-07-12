"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-ghost">
      Export PDF
    </button>
  );
}
