"use client";

import { Star, User, CheckCircle2 } from "lucide-react";
import { Review } from "@/types";
import { cn } from "@/lib/utils";

interface ReviewCardProps {
  review: Review;
  index: number;
}

export default function ReviewCard({ review, index }: ReviewCardProps) {
  const sentimentStyles = {
    POSITIVE: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    NEGATIVE: "bg-red-500/15 text-red-400 border-red-500/20",
    NEUTRAL: "bg-slate-500/15 text-slate-400 border-slate-500/20",
    MIXED: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  };

  return (
    <div className="glass-card rounded-xl p-4 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] text-white/25 font-mono bg-white/5 px-1.5 py-0.5 rounded">
              #{index + 1}
            </span>
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "w-3.5 h-3.5",
                    i < review.rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-white/10"
                  )}
                />
              ))}
            </div>
            {review.sentiment && (
              <span
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border font-medium",
                  sentimentStyles[review.sentiment.label]
                )}
              >
                {review.sentiment.label.toLowerCase()}
              </span>
            )}
          </div>
          {review.title && (
            <h4 className="font-semibold text-sm text-white/80 mb-1 line-clamp-1">
              {review.title}
            </h4>
          )}
          <p className="text-sm text-white/40 line-clamp-3 leading-relaxed">
            {review.body}
          </p>
          <div className="flex items-center gap-3 mt-2.5 text-xs text-white/25">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {review.reviewer}
            </span>
            {review.verified && (
              <span className="flex items-center gap-1 text-emerald-400/60">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </span>
            )}
            {review.date && <span>{review.date}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
