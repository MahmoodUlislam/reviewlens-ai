"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, User, CheckCircle2 } from "lucide-react";
import { Review } from "@/types";
import { cn } from "@/lib/utils";

interface ReviewCardProps {
  review: Review;
  index: number;
}

export default function ReviewCard({ review, index }: ReviewCardProps) {
  const sentimentColor = {
    POSITIVE: "bg-green-100 text-green-800",
    NEGATIVE: "bg-red-100 text-red-800",
    NEUTRAL: "bg-gray-100 text-gray-800",
    MIXED: "bg-yellow-100 text-yellow-800",
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs text-muted-foreground font-mono">
                #{index + 1}
              </span>
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-3.5 h-3.5",
                      i < review.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    )}
                  />
                ))}
              </div>
              {review.sentiment && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    sentimentColor[review.sentiment.label]
                  )}
                >
                  {review.sentiment.label.toLowerCase()}
                </Badge>
              )}
            </div>
            {review.title && (
              <h4 className="font-semibold text-sm mb-1 line-clamp-1">
                {review.title}
              </h4>
            )}
            <p className="text-sm text-muted-foreground line-clamp-3">
              {review.body}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {review.reviewer}
              </span>
              {review.verified && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              )}
              {review.date && <span>{review.date}</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
