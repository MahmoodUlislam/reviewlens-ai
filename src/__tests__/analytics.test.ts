import { describe, it, expect } from "vitest";
import { computeAnalytics } from "@/lib/analytics";
import { Review } from "@/types";

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: "test-id",
    rating: 5,
    title: "Test",
    body: "Test body",
    date: "2026-01-01",
    reviewer: "Tester",
    verified: true,
    ...overrides,
  };
}

describe("computeAnalytics", () => {
  it("calculates correct rating distribution", () => {
    const reviews = [
      makeReview({ rating: 5 }),
      makeReview({ rating: 5 }),
      makeReview({ rating: 4 }),
      makeReview({ rating: 2 }),
      makeReview({ rating: 1 }),
    ];

    const analytics = computeAnalytics(reviews);

    expect(analytics.ratingDistribution).toEqual({
      1: 1,
      2: 1,
      3: 0,
      4: 1,
      5: 2,
    });
  });

  it("calculates correct average rating", () => {
    const reviews = [
      makeReview({ rating: 5 }),
      makeReview({ rating: 3 }),
      makeReview({ rating: 4 }),
    ];

    const analytics = computeAnalytics(reviews);

    expect(analytics.averageRating).toBe(4);
  });

  it("counts total reviews correctly", () => {
    const reviews = [makeReview(), makeReview(), makeReview()];
    const analytics = computeAnalytics(reviews);
    expect(analytics.totalReviews).toBe(3);
  });

  it("handles empty reviews array", () => {
    const analytics = computeAnalytics([]);

    expect(analytics.averageRating).toBe(0);
    expect(analytics.totalReviews).toBe(0);
    expect(analytics.ratingDistribution).toEqual({
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
    });
    expect(analytics.topKeywords).toEqual([]);
  });

  it("extracts top keywords excluding stop words", () => {
    const reviews = [
      makeReview({ title: "Amazing quality", body: "The quality is amazing and durable" }),
      makeReview({ title: "Great quality", body: "Quality material, very durable" }),
    ];

    const analytics = computeAnalytics(reviews);
    const keywords = analytics.topKeywords.map((k) => k.word);

    expect(keywords).toContain("quality");
    expect(keywords).toContain("amazing");
    expect(keywords).toContain("durable");
    // Stop words should not appear
    expect(keywords).not.toContain("the");
    expect(keywords).not.toContain("and");
    expect(keywords).not.toContain("is");
  });

  it("limits keywords to top 20", () => {
    const longBody = Array.from({ length: 30 }, (_, i) => `uniqueword${i}`).join(" ");
    const reviews = [makeReview({ body: longBody })];

    const analytics = computeAnalytics(reviews);

    expect(analytics.topKeywords.length).toBeLessThanOrEqual(20);
  });

  it("counts sentiment breakdown correctly", () => {
    const reviews = [
      makeReview({ sentiment: { label: "POSITIVE", score: 0.95 } }),
      makeReview({ sentiment: { label: "POSITIVE", score: 0.88 } }),
      makeReview({ sentiment: { label: "NEGATIVE", score: 0.75 } }),
      makeReview({ sentiment: { label: "NEUTRAL", score: 0.6 } }),
    ];

    const analytics = computeAnalytics(reviews);

    expect(analytics.sentimentBreakdown).toEqual({
      positive: 2,
      negative: 1,
      neutral: 1,
      mixed: 0,
    });
  });

  it("ignores words shorter than 3 characters", () => {
    const reviews = [
      makeReview({ title: "OK so it is", body: "An ok go at it" }),
    ];

    const analytics = computeAnalytics(reviews);
    const keywords = analytics.topKeywords.map((k) => k.word);

    expect(keywords).not.toContain("ok");
    expect(keywords).not.toContain("it");
    expect(keywords).not.toContain("is");
  });
});
