"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface SentimentChartProps {
  breakdown: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
}

const COLORS = {
  Positive: "#22c55e",
  Negative: "#ef4444",
  Neutral: "#64748b",
  Mixed: "#f59e0b",
};

export default function SentimentChart({ breakdown }: SentimentChartProps) {
  const data = [
    { name: "Positive", value: breakdown.positive },
    { name: "Negative", value: breakdown.negative },
    { name: "Neutral", value: breakdown.neutral },
    { name: "Mixed", value: breakdown.mixed },
  ].filter((d) => d.value > 0);

  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white/90 mb-4">Sentiment Analysis</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            dataKey="value"
            paddingAngle={3}
            label={({ name, percent }) =>
              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
            labelLine={false}
            stroke="rgba(10,10,26,0.5)"
            strokeWidth={2}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={COLORS[entry.name as keyof typeof COLORS]}
                fillOpacity={0.85}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              backgroundColor: "rgba(15,15,35,0.95)",
              backdropFilter: "blur(20px)",
              color: "#f0f0ff",
            }}
          />
          <Legend
            wrapperStyle={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-xs text-center text-white/25 mt-2">
        Powered by Amazon Comprehend
      </p>
    </div>
  );
}
