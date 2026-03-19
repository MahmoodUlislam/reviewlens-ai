import { describe, it, expect, beforeEach } from "vitest";
import { getSession, setSession, deleteSession, hasSession } from "@/lib/store";
import { ReviewSession } from "@/types";

const mockSession: ReviewSession = {
  sessionId: "test-session-123",
  reviews: [
    {
      id: "r1",
      rating: 5,
      title: "Great",
      body: "Awesome product",
      date: "2026-01-01",
      reviewer: "Tester",
      verified: true,
    },
  ],
  metadata: {
    platform: "Amazon",
    productName: "Test Product",
    productUrl: "https://amazon.com/dp/TEST",
    totalReviews: 1,
    averageRating: 5,
    dateRange: { earliest: "2026-01-01", latest: "2026-01-01" },
    scrapedAt: "2026-03-19T00:00:00Z",
  },
};

describe("store", () => {
  beforeEach(() => {
    // Clean up any existing test session
    deleteSession("test-session-123");
    deleteSession("another-session");
  });

  it("stores and retrieves a session", () => {
    setSession("test-session-123", mockSession);
    const retrieved = getSession("test-session-123");

    expect(retrieved).toBeDefined();
    expect(retrieved?.sessionId).toBe("test-session-123");
    expect(retrieved?.reviews).toHaveLength(1);
    expect(retrieved?.metadata.productName).toBe("Test Product");
  });

  it("returns undefined for non-existent session", () => {
    const result = getSession("nonexistent");
    expect(result).toBeUndefined();
  });

  it("checks session existence with hasSession", () => {
    expect(hasSession("test-session-123")).toBe(false);

    setSession("test-session-123", mockSession);

    expect(hasSession("test-session-123")).toBe(true);
  });

  it("deletes a session", () => {
    setSession("test-session-123", mockSession);
    expect(hasSession("test-session-123")).toBe(true);

    const deleted = deleteSession("test-session-123");

    expect(deleted).toBe(true);
    expect(hasSession("test-session-123")).toBe(false);
  });

  it("returns false when deleting non-existent session", () => {
    const deleted = deleteSession("nonexistent");
    expect(deleted).toBe(false);
  });

  it("overwrites existing session on re-set", () => {
    setSession("test-session-123", mockSession);

    const updated = {
      ...mockSession,
      metadata: { ...mockSession.metadata, productName: "Updated Product" },
    };
    setSession("test-session-123", updated);

    const retrieved = getSession("test-session-123");
    expect(retrieved?.metadata.productName).toBe("Updated Product");
  });
});
