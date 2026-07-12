"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = { stroke: "#6e757c", fontSize: 11 };
const GRID = "#292c30";

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
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: GRID }} tick={AXIS} />
          <YAxis tickLine={false} axisLine={false} tick={AXIS} width={44} />
          <Tooltip
            contentStyle={{
              background: "#161718",
              border: "1px solid #292c30",
              borderRadius: 10,
              color: "#b7bcc1",
              fontSize: 12,
            }}
            labelStyle={{ color: "#a4aab0" }}
            formatter={(v: number) => [`${v} t CO₂`, "Emissions"]}
          />
          <Area type="monotone" dataKey="co2" stroke="#39994b" strokeWidth={2} fill="url(#env)" />
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
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: GRID }} tick={AXIS} interval={0} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={AXIS} width={44} />
          <Tooltip
            cursor={{ fill: "#ffffff08" }}
            contentStyle={{
              background: "#161718",
              border: "1px solid #292c30",
              borderRadius: 10,
              color: "#b7bcc1",
              fontSize: 12,
            }}
            formatter={(v: number) => [`${v} / 100`, "Total ESG"]}
          />
          <Bar dataKey="total" radius={[6, 6, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill="#154162" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
