"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import StatsCards from "@/components/StatsCards";
import RatingDistribution from "@/components/RatingDistribution";
import SentimentChart from "@/components/SentimentChart";
import KeywordsCloud from "@/components/KeywordsCloud";
import ReviewCard from "@/components/ReviewCard";
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
              <div key={i} className="glass-card rounded-xl h-24 animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-xl h-72 animate-pulse" />
            <div className="glass-card rounded-xl h-72 animate-pulse" />
          </div>
        </main>
      </>
    );
  }

  if (!metadata || !analytics) return null;

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 6);

  return (
    <>
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8 animate-fade-up">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white/90">
              {metadata.productName}
            </h1>
            <p className="text-sm text-white/40 mt-1">
              {metadata.platform} &middot; {metadata.totalReviews} reviews analyzed &middot;
              Scraped {new Date(metadata.scrapedAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => router.push("/chat")}
            className="gradient-btn text-white font-medium py-2.5 px-5 rounded-xl flex items-center gap-2 text-sm"
          >
            <MessageSquare className="w-4 h-4" />
            Ask Questions
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <StatsCards metadata={metadata} analytics={analytics} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="animate-fade-up delay-200" style={{ animationFillMode: 'backwards' }}>
            <RatingDistribution distribution={analytics.ratingDistribution} />
          </div>
          <div className="animate-fade-up delay-300" style={{ animationFillMode: 'backwards' }}>
            <SentimentChart breakdown={analytics.sentimentBreakdown} />
          </div>
        </div>

        {/* Keywords */}
        {analytics.topKeywords.length > 0 && (
          <div className="mb-8 animate-fade-up delay-400" style={{ animationFillMode: 'backwards' }}>
            <KeywordsCloud keywords={analytics.topKeywords} />
          </div>
        )}

        {/* Reviews */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white/80">Reviews</h2>
            {reviews.length > 6 && (
              <button
                onClick={() => setShowAllReviews(!showAllReviews)}
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                {showAllReviews ? "Show Less" : `Show All (${reviews.length})`}
              </button>
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
