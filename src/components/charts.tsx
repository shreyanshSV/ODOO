"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = { stroke: "#6e757c", fontSize: 11 };
const GRID = "#292c30";
const TOOLTIP = {
  background: "#161718",
  border: "1px solid #33383d",
  borderRadius: 12,
  color: "#b7bcc1",
  fontSize: 12,
  boxShadow: "0 10px 28px rgba(0,0,0,0.4)",
} as const;

export function EmissionsTrend({ data }: { data: { month: string; co2: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="env" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#39994b" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#39994b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: GRID }} tick={AXIS} dy={4} />
          <YAxis tickLine={false} axisLine={false} tick={AXIS} width={44} />
          <Tooltip
            cursor={{ stroke: "#39994b", strokeWidth: 1, strokeDasharray: "4 4" }}
            contentStyle={TOOLTIP}
            labelStyle={{ color: "#a4aab0", marginBottom: 2 }}
            formatter={(v: number) => [`${v} t CO₂`, "Emissions"]}
          />
          <Area
            type="monotone"
            dataKey="co2"
            stroke="#39994b"
            strokeWidth={2.5}
            fill="url(#env)"
            activeDot={{ r: 4, fill: "#39994b", stroke: "#161718", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DeptRanking({ data }: { data: { name: string; total: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="deptBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#68aae7" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#56a2e8" stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: GRID }} tick={AXIS} interval={0} dy={4} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={AXIS} width={44} />
          <Tooltip
            cursor={{ fill: "#ffffff08" }}
            contentStyle={TOOLTIP}
            labelStyle={{ color: "#a4aab0", marginBottom: 2 }}
            formatter={(v: number) => [`${v} / 100`, "Total ESG"]}
          />
          <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="url(#deptBar)" maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
