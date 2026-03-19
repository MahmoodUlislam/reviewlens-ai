# ReviewLens AI — Review Intelligence Portal

A secure, web-based portal that ingests product reviews from **Amazon** and **Google Maps** (or any platform via CSV upload) and enables analysts to interrogate that data through a **guardrailed AI Q&A interface** — without the AI ever drifting off-topic. The platform-agnostic architecture is designed to expand to additional review sources in the future.

**Live URL:** _[deployed URL here]_

---

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    Next.js 16 (App Router)                    │
│                    Deployed on AWS Amplify                    │
│                                                               │
│   ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│   │  Ingest     │   │ Dashboard    │   │  Q&A Chat        │   │
│   │  URL+CSV    │   │ Stats+Charts │   │  Streaming Drawer│   │
│   └─────┬───────┘   └──────┬───────┘   └────────┬─────────┘   │
│         │                  │                    │             │
│   ┌─────▼──────────────────▼────────────────────▼──────────┐  │
│   │                Next.js API Routes                      │  │
│   │  POST /api/ingest  — scrape via Apify or parse CSV     │  │
│   │  POST /api/chat    — guardrailed Q&A (SSE streaming)   │  │
│   └───┬───────────────────────────────┬────────────────────┘  │
│       │                               │                       │
│  ┌────▼───────────┐    ┌──────────────▼───────────────────┐   │
│  │ Scraper        │    │ Amazon Bedrock                   │   │
│  │ Apify REST API │    │ ┌──────────────────────────┐     │   │
│  │ + Product page │    │ │ Bedrock Guardrails (L1)  │     │   │
│  │   fetch        │    │ │ Denied topic policies    │     │   │
│  └────────────────┘    │ └───────────┬──────────────┘     │   │
│                        │ ┌───────────▼───────────────┐    │   │
│  ┌────────────────┐    │ │ Claude Opus 4.6 (L2)      │    │   │
│  │ AWS Comprehend │    │ │ System prompt guard       │    │   │
│  │ (Sentiment)    │    │ └───────────────────────────┘    │   │
│  └────────────────┘    └──────────────────────────────────┘   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐    │
│  │  In-Memory Store (TTL 1hr, max 100 sessions)         │    │
│  │  + SessionStorage (client-side rehydration fallback)  │    │
│  └───────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer              | Technology                                            |
| ------------------ | ----------------------------------------------------- |
| Framework          | Next.js 16.2 (App Router, TypeScript, Turbopack)      |
| Styling            | Tailwind CSS v4 + shadcn/ui                           |
| LLM                | Amazon Bedrock — Claude Opus 4.6                      |
| Scope Guard L1     | Amazon Bedrock Guardrails (denied topic policies)     |
| Scope Guard L2     | System prompt engineering                             |
| Sentiment Analysis | Amazon Comprehend (BatchDetectSentiment)              |
| Scraping           | Apify REST API (Amazon, Google Maps)                  |
| Overall Rating     | Direct product page fetch + regex extraction (Amazon) |
| Import (fallback)  | CSV upload / paste                                    |
| Charts             | Recharts                                              |
| Chat Rendering     | react-markdown with custom theme                      |
| Storage            | In-memory store (TTL + cap) + sessionStorage (client) |
| Deployment         | AWS Amplify                                           |

## Key Design Decision: Dual-Layer Scope Guard

The assignment emphasizes scope guard enforcement. Rather than relying solely on a system prompt, I implemented a **dual-layer approach**:

### Layer 1 — Amazon Bedrock Guardrails (Infrastructure-Level)

- Configured via AWS with **denied topic policies**: weather, news, politics, sports, other review platforms, general knowledge, competitor comparisons
- Applied to every Bedrock API call via `guardrailConfig`
- Blocks off-topic queries **before the LLM even processes them**
- Returns a structured intervention that the UI displays distinctly

### Layer 2 — System Prompt Engineering (Application-Level)

- Strict scoping: "You ONLY answer about the provided reviews"
- Citation requirement: responses must reference specific review numbers
- Graceful decline template for edge cases that slip past the guardrail
- Dynamic context injection: platform, product name, review count, date range

This is how you'd build scope enforcement in production — infrastructure-level guardrails for hard boundaries, prompt engineering for nuance and UX.

## Scraping Strategy

Two-tier approach:

1. **Apify REST API** (primary) — Platform-specific scrapers via Apify actors, called through a unified REST API dispatcher. Each platform has its own actor and field mapping:
   - **Amazon** — `junglee~amazon-reviews-scraper` + parallel product page fetch for overall rating/global ratings
   - **Google Maps** — `compass~google-maps-reviews-scraper` with Local Guide detection
   - The architecture is designed to be **easily extensible** — adding a new platform requires only a new actor ID, field mapping function, and URL validator in `scraper.ts`.
   - Apify token is sent via `Authorization` header (not URL query parameter) for security.
2. **CSV Upload** (always works) — User pastes or uploads review data directly. Fuzzy auto-detection engine matches arbitrary column names (e.g., `star_rating` → `rating`, `customer_feedback` → `body`) via keyword matching + content profiling. Supports any rating scale (5, 10, 100-point) with automatic normalization.

## Getting Started

### Prerequisites

- Node.js 20+
- AWS account with Bedrock access (Claude Opus 4.6 enabled)
- AWS Comprehend access (BatchDetectSentiment permission)
- Apify account (free tier: 5 USD/month compute)

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/reviewlens-ai.git
cd reviewlens-ai

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Configure Environment Variables

```env
# AWS (uses default credentials chain — ~/.aws/credentials or env vars)
AWS_REGION=us-east-1

# Bedrock
BEDROCK_MODEL_ID=us.anthropic.claude-opus-4-6-v1
BEDROCK_GUARDRAIL_ID=your_guardrail_id
BEDROCK_GUARDRAIL_VERSION=DRAFT

# Apify
APIFY_API_TOKEN=your_apify_token
```

### Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

### Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

Test suites cover the core business logic:

| Suite        | What it tests                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `csv-parser` | Auto-detection of arbitrary column names, rating scale normalization, date parsing, empty row filtering, whitespace trimming |
| `analytics`  | Rating distribution, averages, sentiment breakdown, keyword extraction (single-pass)                                         |
| `prompts`    | System prompt construction, scope enforcement rules, decline template with dynamic context                                   |
| `store`      | Session CRUD, existence checks, overwrite behavior (TTL-based eviction)                                                      |

### Testing CSV Upload with Example Data

The repo includes sample review data for testing the "Other Platform" CSV upload flow:

```text
src/__tests__/data/shopify-headphones-reviews.csv
```

This file contains **20 realistic reviews** for a fictional "ProBass X500 Wireless Headphones" product. It intentionally uses **non-standard column names** to validate the auto-detection engine:

| CSV Column          | Auto-detected as |
| ------------------- | ---------------- |
| `product_name`      | _(ignored)_      |
| `star_rating`       | `rating`         |
| `review_title`      | `title`          |
| `customer_feedback` | `body`           |
| `purchase_date`     | `date`           |
| `customer_name`     | `reviewer`       |
| `verified_purchase` | `verified`       |

**To test manually:**

1. Start the dev server: `npm run dev`
2. Open `http://localhost:3000`
3. Select **"Other Platform"** from the platform dropdown
4. Drag and drop `src/__tests__/data/shopify-headphones-reviews.csv` onto the upload zone (or click to browse)
5. Enter a product name (e.g., "ProBass X500 Wireless Headphones")
6. Click **Upload & Analyze**
7. Verify the dashboard shows all 20 reviews with correct ratings (1–5), dates, sentiment analysis, and reviewer names

**What the auto-detection engine handles:**

- **Arbitrary column names** — Headers like `star_rating`, `customer_feedback`, `user_name`, `comment`, etc. are matched via fuzzy keyword matching + content analysis
- **Any rating scale** — 5-point, 10-point, or 100-point scales are detected and normalized to 1–5
- **Mixed date formats** — `2024-01-15`, `Jan 15, 2024`, `15/01/2024`, ISO 8601 are all normalized to `YYYY-MM-DD`
- **Missing columns** — If a column can't be detected (e.g., no reviewer column), sensible defaults are applied (`"Anonymous"`, `false`, etc.)
- **Empty rows** — Rows with no review text are filtered out with a warning

## Assumptions

1. **Two platforms currently supported** — Amazon and Google Maps via Apify scrapers; additional platforms (G2, Capterra, Trustpilot, etc.) can be added by extending the scraper dispatcher. Any platform works via CSV upload.
2. **Hybrid storage** — Server-side in-memory store with TTL (1 hour) and capacity cap (100 sessions) + client-side sessionStorage for rehydration on worker recycle. Production would use DynamoDB.
3. **No user authentication** — Per assignment requirements, the app is directly accessible
4. **Bedrock costs** — Claude Opus 4.6 pay-per-token; total demo cost < $1
5. **Apify free tier** — 5 USD/month compute credit is sufficient for demo and evaluation
6. **English reviews only** — Comprehend sentiment analysis configured for English

## Architecture Diagrams

Detailed draw.io diagrams are available in [`docs/diagrams/`](docs/diagrams/) — open them with the [draw.io VS Code extension](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio) or at [app.diagrams.net](https://app.diagrams.net):

| Diagram | File | Description |
| ------- | ---- | ----------- |
| Cloud Architecture | `cloud-architecture.drawio` | AWS services layout — Amplify, Bedrock, Comprehend, Apify, Vercel alternative |
| App Architecture | `app-architecture.drawio` | Full 4-layer stack: Presentation → API → Service → External Services |
| User Flow | `user-flow.drawio` | End-to-end user journey from ingestion to AI Q&A with guardrail checks |
| Backend Structure | `backend-structure.drawio` | API routes, service modules, and external service connections |
| Frontend Structure | `frontend-structure.drawio` | Pages, component hierarchy, data flow, and navigation |

## Hardening & Security

The prototype includes several production-minded safeguards:

| Area | Implementation |
| --- | --- |
| **Session management** | TTL-based eviction (1 hr) + max 100 sessions cap prevents memory leaks |
| **Input validation** | Chat history sanitized (valid roles only, 50 message cap, 10K char limit per message) |
| **Body size limits** | CSV uploads capped at 5 MB on both client and server; session rehydration capped at 500 reviews |
| **API token security** | Apify token sent via `Authorization` header, never in URL query params |
| **Streaming safety** | `AbortController` cancels in-flight requests on navigation/unmount; `AbortError` silently ignored |
| **Parallel processing** | Comprehend sentiment batches run in parallel via `Promise.all` for faster ingestion |
| **Chronological sorting** | Date sorting uses `Date` parsing with fallback, not naive lexicographic sort |

## What I'd Do With More Time

- **DynamoDB persistence** — Sessions survive server restarts and scale horizontally
- **Bedrock Agent + Knowledge Base** — RAG for 10,000+ reviews beyond context window limits
- **More review platforms** — G2, Capterra, Trustpilot, TripAdvisor (architecture already supports plug-in scrapers)
- **Multi-product comparison** — Compare sentiment across products
- **PDF/CSV export** — Download analysis reports
- **Rate limiting** — Per-IP or per-session throttling to protect the Bedrock API from abuse
- **Review pagination** — Handle products with 10,000+ reviews
- **E2E tests** — Playwright tests for the full flow

---

Built with Next.js 16, Amazon Bedrock (Claude Opus 4.6), Bedrock Guardrails, Amazon Comprehend, Apify, and Claude Code.

Powered by Mahmood.
