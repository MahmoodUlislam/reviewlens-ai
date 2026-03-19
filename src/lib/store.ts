import { ReviewSession } from "@/types";

// In-memory store for review sessions
// In production, this would be DynamoDB or similar
const sessions = new Map<string, ReviewSession>();

export function getSession(sessionId: string): ReviewSession | undefined {
  return sessions.get(sessionId);
}

export function setSession(sessionId: string, session: ReviewSession): void {
  sessions.set(sessionId, session);
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

export function hasSession(sessionId: string): boolean {
  return sessions.has(sessionId);
}
