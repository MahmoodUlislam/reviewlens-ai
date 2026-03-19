import { ReviewSession } from "@/types";

// In-memory store for review sessions
// In production, this would be DynamoDB or similar

interface StoredSession {
  session: ReviewSession;
  lastAccessed: number;
}

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_SESSIONS = 100;

const sessions = new Map<string, StoredSession>();

/** Remove sessions that have exceeded their TTL */
function evictStale(): void {
  const now = Date.now();
  for (const [id, entry] of sessions) {
    if (now - entry.lastAccessed > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

/** If we're still over the limit after eviction, drop the oldest */
function evictOldest(): void {
  if (sessions.size <= MAX_SESSIONS) return;
  let oldestId: string | null = null;
  let oldestTime = Infinity;
  for (const [id, entry] of sessions) {
    if (entry.lastAccessed < oldestTime) {
      oldestTime = entry.lastAccessed;
      oldestId = id;
    }
  }
  if (oldestId) sessions.delete(oldestId);
}

export function getSession(sessionId: string): ReviewSession | undefined {
  const entry = sessions.get(sessionId);
  if (!entry) return undefined;

  // Check if expired
  if (Date.now() - entry.lastAccessed > SESSION_TTL_MS) {
    sessions.delete(sessionId);
    return undefined;
  }

  entry.lastAccessed = Date.now();
  return entry.session;
}

export function setSession(sessionId: string, session: ReviewSession): void {
  evictStale();
  sessions.set(sessionId, { session, lastAccessed: Date.now() });
  evictOldest();
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

export function hasSession(sessionId: string): boolean {
  const entry = sessions.get(sessionId);
  if (!entry) return false;
  if (Date.now() - entry.lastAccessed > SESSION_TTL_MS) {
    sessions.delete(sessionId);
    return false;
  }
  return true;
}
