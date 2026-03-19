"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface RatingDistributionProps {
  distribution: Record<number, number>;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

export default function RatingDistribution({ distribution }: RatingDistributionProps) {
  const data = [1, 2, 3, 4, 5].map((rating) => ({
    rating: `${rating} ★`,
    count: distribution[rating] || 0,
    fill: COLORS[rating - 1],
  }));

  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white/90 mb-4">Rating Distribution</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={12} />
          <YAxis dataKey="rating" type="category" width={45} stroke="rgba(255,255,255,0.3)" fontSize={12} />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              backgroundColor: "rgba(15,15,35,0.95)",
              backdropFilter: "blur(20px)",
              color: "#f0f0ff",
            }}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
