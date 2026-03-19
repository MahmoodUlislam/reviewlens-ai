"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Neutral: "#94a3b8",
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sentiment Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              dataKey="value"
              paddingAngle={2}
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={COLORS[entry.name as keyof typeof COLORS]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--card))",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <p className="text-xs text-center text-muted-foreground mt-2">
          Powered by Amazon Comprehend
        </p>
      </CardContent>
    </Card>
  );
}
