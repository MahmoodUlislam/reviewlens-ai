# Session 3 — Streaming Chat & UI Polish
**Date:** 2026-03-18
**AI Tool:** Claude Code (Claude Opus 4.6)
**Duration:** ~60 min

## Objective
Implement real-time streaming Q&A chat with Bedrock and polish the glassmorphism UI.

## Key Decisions Made with AI

### Chat as Drawer vs Full Page
- **Prompt:** "Open the chat as a sliding panel rather than navigating to a separate page"
- **Decision:** Built a `ChatDrawer` component — slides in from the right, responsive width (85vw tablet → 65vw desktop), backdrop blur, ESC to close
- **Added:** Floating chat button on dashboard for quick access

### Streaming Architecture
- **Problem:** SSE streaming was arriving as 1-2 large chunks instead of token-by-token
- **Root causes identified:**
  1. `ReadableStream` with `start()` buffers entire response before sending
  2. Next.js compression (`gzip`) buffers chunks before flushing
  3. Browser `Accept-Encoding` header causes response buffering
- **Fixes applied:**
  - Switched to `pull()` pattern per Next.js 16 docs (iterator-to-stream)
  - Set `compress: false` in next.config.ts
  - Added `Accept-Encoding: identity` on client fetch
  - Added `export const dynamic = "force-dynamic"` to chat route

### Turbopack Worker Isolation
- **Problem:** In-memory session store was invisible across Turbopack workers — dashboard got 404s, chat got "session not found"
- **Fix:** Return full session data from ingest API, store in sessionStorage, pass to chat route on first message for hydration

### Markdown Rendering
- **Problem:** Bedrock responses contain markdown (headings, bold, lists) but rendered as plain text
- **Fix:** Added `react-markdown` with custom CSS theme matching the glassmorphism design

## UI Enhancements
- Sentiment-colored left borders on review cards (green/red/amber/slate)
- Confidence score percentage badges
- White tooltip text in charts (was black on dark background)
- Responsive chat drawer width using viewport units

## What Went Well
- Pull-based streaming pattern from Next.js 16 docs was the correct approach
- Chat drawer UX is much better than a separate page — users stay in context

## Dead Ends
- `TransformStream` approach — still buffered in Turbopack dev
- `ScrollArea` from shadcn — ref pointed to wrong element, replaced with plain overflow div
- Artificial token queue animation — rejected in favor of real streaming behavior
