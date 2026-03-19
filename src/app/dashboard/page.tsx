"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import StatsCards from "@/components/StatsCards";
import RatingDistribution from "@/components/RatingDistribution";
import SentimentChart from "@/components/SentimentChart";
import KeywordsCloud from "@/components/KeywordsCloud";
import ReviewCard from "@/components/ReviewCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Review, ReviewMetadata, AnalyticsData } from "@/types";
import { MessageSquare, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [metadata, setMetadata] = useState<ReviewMetadata | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    const sessionId = sessionStorage.getItem("reviewlens_session");
    if (!sessionId) {
      router.push("/");
      return;
    }

    const fetchData = async () => {
      try {
        const [reviewsRes, analyticsRes] = await Promise.all([
          fetch(`/api/reviews?sessionId=${sessionId}`),
          fetch(`/api/analytics?sessionId=${sessionId}`),
        ]);

        if (!reviewsRes.ok || !analyticsRes.ok) {
          router.push("/");
          return;
        }

        const reviewsData = await reviewsRes.json();
        const analyticsData = await analyticsRes.json();

        setReviews(reviewsData.reviews);
        setMetadata(reviewsData.metadata);
        setAnalytics(analyticsData.analytics);
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-72 rounded-lg" />
            <Skeleton className="h-72 rounded-lg" />
          </div>
        </main>
      </>
    );
  }

  if (!metadata || !analytics) {
    return null;
  }

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 6);

  return (
    <>
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{metadata.productName}</h1>
            <p className="text-sm text-muted-foreground">
              {metadata.platform} • {metadata.totalReviews} reviews analyzed •
              Scraped {new Date(metadata.scrapedAt).toLocaleDateString()}
            </p>
          </div>
          <Button onClick={() => router.push("/chat")}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Ask Questions
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Stats cards */}
        <div className="mb-8">
          <StatsCards metadata={metadata} analytics={analytics} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <RatingDistribution distribution={analytics.ratingDistribution} />
          <SentimentChart breakdown={analytics.sentimentBreakdown} />
        </div>

        {/* Keywords */}
        {analytics.topKeywords.length > 0 && (
          <div className="mb-8">
            <KeywordsCloud keywords={analytics.topKeywords} />
          </div>
        )}

        {/* Reviews list */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Reviews</h2>
            {reviews.length > 6 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllReviews(!showAllReviews)}
              >
                {showAllReviews
                  ? "Show Less"
                  : `Show All (${reviews.length})`}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedReviews.map((review, i) => (
              <ReviewCard key={review.id} review={review} index={i} />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
