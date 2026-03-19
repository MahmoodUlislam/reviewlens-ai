"use client";

import { Star, MessageSquare, Calendar, TrendingUp } from "lucide-react";
import { ReviewMetadata, AnalyticsData } from "@/types";
import { cn } from "@/lib/utils";

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
      ? Math.round((analytics.sentimentBreakdown.positive / sentimentTotal) * 100)
      : 0;

  const stats = [
    {
      label: "Total Reviews",
      value: metadata.totalReviews.toLocaleString(),
      icon: MessageSquare,
      gradient: "from-violet-500 to-purple-600",
      glow: "shadow-violet-500/20",
    },
    {
      label: metadata.overallRating ? "Overall Rating" : "Average Rating",
      value: (metadata.overallRating ?? analytics.averageRating).toFixed(1),
      icon: Star,
      gradient: "from-amber-500 to-orange-600",
      glow: "shadow-amber-500/20",
      suffix: metadata.totalGlobalRatings
        ? `/ 5 · ${metadata.totalGlobalRatings.toLocaleString()} ${metadata.platform === "Amazon" ? "global ratings" : "reviews"}`
        : "/ 5",
    },
    {
      label: "Positive Sentiment",
      value: `${positivePercent}%`,
      icon: TrendingUp,
      gradient: "from-emerald-500 to-green-600",
      glow: "shadow-emerald-500/20",
    },
    {
      label: "Date Range",
      value:
        metadata.dateRange.earliest === "Unknown"
          ? "N/A"
          : `${metadata.dateRange.earliest.slice(0, 10)} — ${metadata.dateRange.latest !== "Unknown" ? metadata.dateRange.latest.slice(0, 10) : "Present"}`,
      icon: Calendar,
      gradient: "from-cyan-500 to-blue-600",
      glow: "shadow-cyan-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="glass-card rounded-xl p-5 animate-fade-up"
            style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'backwards' }}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl bg-linear-to-br ${stat.gradient} flex items-center justify-center shadow-lg ${stat.glow}`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className={cn(
                  "font-bold text-white/90 whitespace-nowrap",
                  stat.value.length > 15 ? "text-sm" : stat.value.length > 10 ? "text-lg" : "text-2xl"
                )}>
                  {stat.value}
                  {stat.suffix && (
                    <span className="text-sm font-normal text-white/30 ml-1">
                      {stat.suffix}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
