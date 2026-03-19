"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import StatsCards from "@/components/StatsCards";
import RatingDistribution from "@/components/RatingDistribution";
import SentimentChart from "@/components/SentimentChart";
import KeywordsCloud from "@/components/KeywordsCloud";
import ReviewCard from "@/components/ReviewCard";
import ChatDrawer from "@/components/ChatDrawer";
import { Review, ReviewMetadata, AnalyticsData } from "@/types";
import { MessageSquare } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [metadata, setMetadata] = useState<ReviewMetadata | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const closeChat = useCallback(() => setChatOpen(false), []);

  useEffect(() => {
    const sid = sessionStorage.getItem("reviewlens_session");
    const metaStr = sessionStorage.getItem("reviewlens_metadata");
    const reviewsStr = sessionStorage.getItem("reviewlens_reviews");
    const analyticsStr = sessionStorage.getItem("reviewlens_analytics");

    if (!sid || !metaStr || !reviewsStr || !analyticsStr) {
      router.push("/");
      return;
    }

    try {
      setSessionId(sid);
      setMetadata(JSON.parse(metaStr));
      setReviews(JSON.parse(reviewsStr));
      setAnalytics(JSON.parse(analyticsStr));
    } catch {
      router.push("/");
      return;
    }
    setLoading(false);
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
            onClick={() => setChatOpen(true)}
            className="gradient-btn text-white font-medium py-2.5 px-5 rounded-xl flex items-center gap-2 text-sm"
          >
            <MessageSquare className="w-4 h-4" />
            Ask Questions
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

      {/* Floating chat button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed! bottom-8 right-8 w-14 h-14 rounded-full text-white shadow-xl shadow-violet-500/25 flex items-center justify-center z-40 hover:scale-105 transition-transform"
          style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Chat drawer */}
      {sessionId && metadata && (
        <ChatDrawer
          open={chatOpen}
          onClose={closeChat}
          sessionId={sessionId}
          metadata={metadata}
        />
      )}
    </>
  );
}
