# Session 7 — Architecture Diagrams & Vision-Based Scraping
**Date:** 2026-03-19
**AI Tool:** Claude Code (Claude Opus 4.6)
**Duration:** ~15 min

## Objective
Create comprehensive architecture diagrams for the project documentation and document a vision-based scraping approach as a future improvement.

## Key Decisions Made with AI

### Architecture Diagrams
- **Prompt:** "Create draw.io architecture diagrams covering: overall app architecture, cloud architecture, frontend structure, backend structure, and user flow"
- **Decision:** Created five `.drawio` files in `docs/diagrams/`:
  - `app-architecture.drawio` — end-to-end system overview (client → Next.js → AWS services)
  - `cloud-architecture.drawio` — AWS service topology (Amplify, Bedrock, Comprehend, Apify)
  - `frontend-structure.drawio` — component tree and page hierarchy
  - `backend-structure.drawio` — API routes, lib modules, data flow
  - `user-flow.drawio` — user journey from URL input through analysis to chat
- **AI helped:** Generate the draw.io XML with correct node positioning, connection routing, and styling

### Vision-Based Scraping Documentation
- **Prompt:** "Add a section to FUTURE_IMPROVEMENTS.md about vision-based scraping — using screenshots and AI vision models instead of DOM parsing, and how it could work as a browser extension"
- **Decision:** Documented an alternative scraping approach that captures page screenshots and uses AI vision models (e.g., Claude's vision capability) to extract review data
- **Rationale:** More resilient to DOM changes than traditional CSS-selector scraping; outlined potential implementation as a browser extension

## What Went Well
- draw.io XML format produced detailed, editable diagrams that render in GitHub and VS Code
- Vision-based scraping concept provides a clear upgrade path beyond fragile selector-based scraping

## Dead Ends
- None — documentation session with no implementation blockers
