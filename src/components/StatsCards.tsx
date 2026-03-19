"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Star, MessageSquare, Calendar, TrendingUp } from "lucide-react";
import { ReviewMetadata, AnalyticsData } from "@/types";

interface StatsCardsProps {
  metadata: ReviewMetadata;
  analytics: AnalyticsData;
}

export default function StatsCards({ metadata, analytics }: StatsCardsProps) {
  const sentimentTotal =
    analytics.sentimentBreakdown.positive +
    analytics.sentimentBreakdown.negative +
    analytics.sentimentBreakdown.neutral +
    analytics.sentimentBreakdown.mixed;

  const positivePercent =
    sentimentTotal > 0
      ? Math.round(
          (analytics.sentimentBreakdown.positive / sentimentTotal) * 100
        )
      : 0;

  const stats = [
    {
      label: "Total Reviews",
      value: metadata.totalReviews.toLocaleString(),
      icon: MessageSquare,
      color: "text-blue-500",
    },
    {
      label: "Average Rating",
      value: analytics.averageRating.toFixed(1),
      icon: Star,
      color: "text-yellow-500",
      suffix: "/ 5",
    },
    {
      label: "Positive Sentiment",
      value: `${positivePercent}%`,
      icon: TrendingUp,
      color: "text-green-500",
    },
    {
      label: "Date Range",
      value: metadata.dateRange.earliest === "Unknown"
        ? "N/A"
        : `${metadata.dateRange.earliest.slice(0, 10)}`,
      icon: Calendar,
      color: "text-purple-500",
      suffix:
        metadata.dateRange.latest !== "Unknown"
          ? ` — ${metadata.dateRange.latest.slice(0, 10)}`
          : "",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg bg-muted ${stat.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold">
                    {stat.value}
                    {stat.suffix && (
                      <span className="text-sm font-normal text-muted-foreground">
                        {stat.suffix}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
