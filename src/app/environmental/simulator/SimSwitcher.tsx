"use client";

import { useState } from "react";
import { PROFILES } from "@/lib/sim/profiles";
import { TransportSim } from "./TransportSim";

const MODES = [
  { id: "ship", label: "Ship", emoji: "🚢" },
  { id: "air", label: "Air", emoji: "✈️" },
  { id: "ground", label: "Ground", emoji: "🚛" },
];

export function SimSwitcher({ departments }: { departments: { id: string; name: string }[] }) {
  const [mode, setMode] = useState("ship");
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${mode === m.id ? "bg-env text-bg" : "btn-ghost"}`}
          >
            {m.emoji} {m.label} Sim
          </button>
        ))}
      </div>
      {/* key forces a clean remount (fresh map/state) when switching modes */}
      <TransportSim key={mode} profile={PROFILES[mode]} departments={departments} />
    </div>
  );
}
