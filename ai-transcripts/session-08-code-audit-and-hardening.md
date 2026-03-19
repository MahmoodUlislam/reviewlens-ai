# Session 8 — Code Audit, Bug Fixes & Production Hardening
**Date:** 2026-03-19
**AI Tool:** Claude Code (Claude Opus 4.6)
**Duration:** ~45 min

## Objective
Perform a comprehensive code audit across the entire codebase to identify bugs, security vulnerabilities, potential errors, and optimization opportunities — then fix all issues and update documentation to reflect the changes.

## Round 1 — Initial Audit & Fixes

### Bugs Found & Fixed

#### 1. Memory Leak in Session Store
- **File:** `src/lib/store.ts`
- **Bug:** The in-memory `Map<string, ReviewSession>` grew unbounded — every ingestion created a session that was never cleaned up, eventually exhausting server memory
- **Fix:** Added TTL-based eviction (1 hour) + max capacity cap (100 sessions). Sessions expire on read; stale entries are cleaned on write; oldest session is dropped if over capacity
- **AI helped:** Design the eviction strategy with both time-based and size-based limits

#### 2. Stale Closure in Chat History
- **File:** `src/components/ChatInterface.tsx`
- **Bug:** `messages` state was read inside `sendMessage` via closure, capturing the value from the render that created it — history was always one message behind
- **Fix:** Capture `const currentMessages = [...messages]` before calling `setMessages`, use that for history

#### 3. Session Rehydration Only on First Message
- **File:** `src/components/ChatInterface.tsx`
- **Bug:** `sessionData` was only sent to the server when `messages.length === 0`. After a server restart or worker recycle, subsequent messages would fail with 404
- **Fix:** Always send `sessionData` from sessionStorage when reviews are available, enabling rehydration on any request

### Security Issues Found & Fixed

#### 4. Apify Token Exposed in URL Query Parameter
- **File:** `src/lib/scraper.ts`
- **Bug:** API token appended to URL as `?token=...`, risking exposure in server logs, proxies, and error tracking
- **Fix:** Moved to `Authorization: Bearer` header via `new Headers()`

#### 5. No Input Validation on Chat History
- **File:** `src/app/api/chat/route.ts`
- **Bug:** Client-provided `history` array passed directly to Bedrock without validation — allowed arbitrary role injection
- **Fix:** Added sanitization: validates array type, filters to valid roles (`user`/`assistant`), caps at 50 messages and 10K chars each

#### 6. No CSV Body Size Limit
- **File:** `src/app/api/ingest/route.ts`
- **Bug:** No size limit on `csvData` — client could send multi-GB payloads causing OOM
- **Fix:** Added 5 MB limit via both `Content-Length` header check and string length validation

### Optimizations Implemented

#### 7. Parallel Comprehend Sentiment Batches
- **File:** `src/lib/comprehend.ts`
- **Before:** Sequential `for` loop — 4 API calls in series for 100 reviews
- **After:** `Promise.all` — all batches run concurrently, cutting ingestion time proportionally

#### 8. Single-Pass Analytics Computation
- **File:** `src/lib/analytics.ts`
- **Before:** Three separate loops over all reviews (rating distribution, sentiment, keywords)
- **After:** Single loop computes all three in one pass

#### 9. AbortController on Chat Fetch
- **File:** `src/components/ChatInterface.tsx`
- **Fix:** Added `AbortController` to cancel in-flight requests on navigation/unmount; cleanup on component unmount via `useEffect` return

#### 10. Removed Dead Code
- **File:** `src/lib/prompts.ts`, `src/__tests__/prompts.test.ts`
- **Issue:** `buildScopeGuardCheck` function was defined but never called anywhere
- **Fix:** Removed function and its 3 associated tests

#### 11. Fixed Date Sorting
- **File:** `src/app/api/ingest/route.ts`
- **Bug:** Lexicographic `.sort()` produced wrong order for non-ISO date formats (e.g., "January 15, 2024")
- **Fix:** Chronological comparator using `new Date()` parsing with fallback for unparseable dates

## Round 2 — Second Pass

### Additional Issues Found & Fixed

#### 12. AbortError Showing Error Message
- **File:** `src/components/ChatInterface.tsx`
- **Bug:** When component unmounts during streaming, `AbortError` triggered the catch block showing "Sorry, something went wrong"
- **Fix:** Added `AbortError` detection — silently returns instead of displaying error

#### 13. Unvalidated SessionData from Client
- **File:** `src/app/api/chat/route.ts`
- **Bug:** Chat route blindly trusted `sessionData` from client, allowing injection of arbitrary review data
- **Fix:** Added structural validation (array check, metadata field type checks) + capped reviews at 500

#### 14. No Client-Side File Size Check
- **File:** `src/components/IngestForm.tsx`
- **Bug:** Users uploading large files only got error after full upload + server round-trip
- **Fix:** Added 5 MB file size check on both file input and drag-and-drop, with immediate error feedback

#### 15. Bedrock maxTokens Too Low
- **File:** `src/lib/bedrock.ts`
- **Issue:** `maxTokens: 1024` (~750 words) caused truncated responses on detailed multi-review analyses
- **Fix:** Increased to 4096 tokens

## Round 3 — ESLint Compliance

### Lint Errors Fixed

#### 16. `prefer-const` Violations
- **Files:** `src/app/api/ingest/route.ts`, `src/lib/csv-parser.ts`
- **Fix:** Changed `let` to `const` for `productUrl` and destructured date variables; refactored date year normalization to avoid reassignment

#### 17. React 19 `setState-in-effect` Violations
- **Files:** `src/components/Header.tsx`, `src/app/chat/page.tsx`, `src/app/dashboard/page.tsx`
- **Issue:** React 19's strict lint rules flag `setState` calls inside `useEffect` as causing cascading renders
- **Fix for Header:** Removed `useState` + `useEffect` entirely — computed `hasSession` directly during render (client component re-renders on pathname change)
- **Fix for Chat/Dashboard:** Replaced `useEffect` + multiple `setState` calls with `useState` lazy initializer that reads sessionStorage once during initial render; `useEffect` only handles redirect navigation

#### 18. `react-hooks/refs` Violation
- **Files:** `src/app/chat/page.tsx`, `src/app/dashboard/page.tsx`
- **Issue:** Initial approach used `useRef(...).current` during render, which React 19 lint forbids
- **Fix:** Switched to `useState` with lazy initializer — correct pattern for one-time initialization from external sources (sessionStorage)

#### 19. Missing `useCallback` Dependency
- **File:** `src/components/IngestForm.tsx`
- **Issue:** `MAX_FILE_SIZE` was declared inside component, flagged as missing dependency in `useCallback`
- **Fix:** Moved `MAX_FILE_SIZE` constant to module scope (shared across components)

#### 20. Tailwind CSS Class Suggestion
- **File:** `src/components/Header.tsx`
- **Fix:** Replaced deprecated `bg-gradient-to-r` with canonical `bg-linear-to-r`

## Documentation Updates

### README.md
- Removed all Yelp references (no Yelp scraper exists in codebase)
- Updated platform count from 3 to 2 (Amazon, Google Maps)
- Updated architecture diagram to show TTL in-memory store + sessionStorage rehydration
- Updated tech stack table (storage row)
- Expanded scraping section with auth header detail and CSV auto-detection description
- Updated test suite table (removed scope guard, added single-pass and TTL notes)
- Added new **Hardening & Security** section documenting all safeguards
- Updated Assumptions section (hybrid storage, 2 platforms)

### FUTURE_IMPROVEMENTS.md
- Added 4 bullet points to "Current Prototype Approach" documenting implemented hardening
- Updated DynamoDB section to acknowledge existing in-memory TTL store as foundation

### DESIGN_BOOK.md
- Reviewed — no changes needed (purely visual design docs, unaffected by backend/logic changes)

## Final Verification

| Check | Result |
|-------|--------|
| **ESLint** | 0 errors, 0 warnings |
| **Vitest** | 27/27 tests passed |
| **Next.js Build** | Compiled successfully, all 9 routes generated |

## Files Modified (16 total)

| File | Changes |
|------|---------|
| `src/lib/store.ts` | TTL eviction + capacity cap |
| `src/lib/bedrock.ts` | maxTokens 1024 → 4096 |
| `src/lib/comprehend.ts` | Parallel batch processing |
| `src/lib/analytics.ts` | Single-pass computation |
| `src/lib/scraper.ts` | Auth header for Apify token |
| `src/lib/prompts.ts` | Removed dead `buildScopeGuardCheck` |
| `src/lib/csv-parser.ts` | Fixed prefer-const in date normalization |
| `src/app/api/chat/route.ts` | History validation + sessionData validation |
| `src/app/api/ingest/route.ts` | CSV size limit + chronological date sort + prefer-const |
| `src/app/chat/page.tsx` | Lazy useState initializer (SSR-safe) |
| `src/app/dashboard/page.tsx` | Lazy useState initializer (SSR-safe) |
| `src/components/ChatInterface.tsx` | Stale closure fix + AbortController + always send sessionData |
| `src/components/IngestForm.tsx` | Client-side file size check + module-scope constant |
| `src/components/Header.tsx` | Removed effect, compute during render |
| `src/__tests__/prompts.test.ts` | Removed dead tests for deleted function |
| `README.md` | Hardening section, Yelp removal, updated tables |
| `docs/FUTURE_IMPROVEMENTS.md` | Documented implemented hardening |

## What Went Well
- Three-round audit approach (bugs → second pass → lint) caught progressively deeper issues
- React 19's strict lint rules exposed SSR patterns that needed modernization (`useState` lazy init over `useEffect` + `setState`)
- All fixes maintained backward compatibility — no API changes, no data format changes
- Parallel Comprehend batches provide measurable performance improvement with zero complexity cost

## Dead Ends
- Initial attempt to fix `setState-in-effect` used `useRef(...).current` during render — React 19 lint also forbids this; switched to `useState` lazy initializer
- Considered `useSyncExternalStore` for sessionStorage reads — overcomplicated for one-time initialization; `useState` lazy init is the correct pattern

## Key Takeaway
The codebase was functionally correct but had production-readiness gaps: unbounded memory, unvalidated inputs, sequential processing, and stale React patterns. A systematic audit caught 20 issues across security, performance, correctness, and lint compliance — all fixed without breaking any existing functionality.
