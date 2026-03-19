# ReviewLens AI — Review Intelligence Portal

A secure, web-based portal that ingests product reviews from Amazon and enables analysts to interrogate that data through a **guardrailed AI Q&A interface** — without the AI ever drifting off-topic.

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
│         │                │                     │              │
│   ┌─────▼────────────────▼─────────────────────▼───────────┐  │
│   │                Next.js API Routes                      │  │
│   │  POST /api/ingest  — scrape via Apify or parse CSV     │  │
│   │  POST /api/chat    — guardrailed Q&A (SSE streaming)   │  │
│   └───┬──────────────────────────────┬─────────────────────┘  │
│       │                              │                        │
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
│  │  SessionStorage (client-side session persistence)     │    │
│  └───────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer              | Technology                                        |
| ------------------ | ------------------------------------------------- |
| Framework          | Next.js 16.2 (App Router, TypeScript, Turbopack)  |
| Styling            | Tailwind CSS v4 + shadcn/ui                       |
| LLM                | Amazon Bedrock — Claude Opus 4.6                  |
| Scope Guard L1     | Amazon Bedrock Guardrails (denied topic policies) |
| Scope Guard L2     | System prompt engineering                         |
| Sentiment Analysis | Amazon Comprehend (BatchDetectSentiment)          |
| Scraping           | Apify REST API (Amazon Reviews Scraper)           |
| Overall Rating     | Direct product page fetch + regex extraction      |
| Import (fallback)  | CSV upload / paste                                |
| Charts             | Recharts                                          |
| Chat Rendering     | react-markdown with custom theme                  |
| Storage            | sessionStorage (client-side)                      |
| Deployment         | AWS Amplify                                       |

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

1. **Apify REST API** (primary) — Pre-built Amazon Reviews Scraper actor (`junglee~amazon-reviews-scraper`), handles anti-bot, pagination, proxy rotation. Called via REST API directly (no SDK — avoids Turbopack dynamic import issues). Overall product rating and total global ratings are scraped in parallel from the product page.
2. **CSV Upload** (always works) — User pastes or uploads review data directly. Supports flexible column names.

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

## Assumptions

1. **Amazon as target platform** — Most structured review data, well-supported by Apify scraper
2. **Client-side storage** — sessionStorage for prototype; production would use DynamoDB
3. **No user authentication** — Per assignment requirements, the app is directly accessible
4. **Bedrock costs** — Claude Opus 4.6 pay-per-token; total demo cost < $1
5. **Apify free tier** — 5 USD/month compute credit is sufficient for demo and evaluation
6. **English reviews only** — Comprehend sentiment analysis configured for English

## What I'd Do With More Time

- **DynamoDB persistence** — Sessions survive server restarts
- **Bedrock Agent + Knowledge Base** — RAG for 10,000+ reviews beyond context window limits
- **Multi-product comparison** — Compare sentiment across products
- **PDF/CSV export** — Download analysis reports
- **Rate limiting** — Protect the Bedrock API from abuse
- **Review pagination** — Handle products with 10,000+ reviews
- **E2E tests** — Playwright tests for the full flow

---

Built with Next.js 16, Amazon Bedrock (Claude Opus 4.6), Bedrock Guardrails, Amazon Comprehend, Apify, and Claude Code.

Powered by Mahmood.
