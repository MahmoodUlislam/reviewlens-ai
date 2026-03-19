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
│   │  URL+CSV    │   │ Stats+Charts │   │  Guardrailed     │   │
│   └─────┬───────┘   └──────┬───────┘   └────────┬─────────┘   │
│         │                │                     │              │
│   ┌─────▼────────────────▼─────────────────────▼───────────┐  │
│   │                Next.js API Routes                      │  │
│   │  POST /api/ingest  — scrape or parse CSV               │  │
│   │  POST /api/chat    — guardrailed Q&A (SSE streaming)   │  │
│   │  GET  /api/reviews — retrieve stored reviews           │  │
│   │  GET  /api/analytics — sentiment + stats               │  │
│   └───┬──────────────────────────────┬─────────────────────┘  │
│       │                              │                        │
│  ┌────▼───────────┐    ┌──────────────▼───────────────────┐   │
│  │ Scraper        │    │ Amazon Bedrock                   │   │
│  │ Apify (primary)│    │ ┌──────────────────────────┐     │   │
│  │ Lambda (backup)│    │ │ Bedrock Guardrails (L1)  │     │   │
│  │ CSV (fallback) │    │ │ Denied topic policies    │     │   │
│  └────────────────┘    │ └───────────┬──────────────┘     │   │
│                        │ ┌───────────▼───────────────┐    │   │
│  ┌────────────────┐    │ │ Claude 3.5 Haiku (L2)     │    │   │
│  │ AWS Comprehend │    │ │ System prompt guard       │    │   │
│  │ (Sentiment)    │    │ └───────────────────────────┘    │   │
│  └────────────────┘    └──────────────────────────────────┘   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐    │
│  │  In-Memory Store (Map<sessionId, ReviewSession>)      │    │
│  └───────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer              | Technology                                        |
| ------------------ | ------------------------------------------------- |
| Framework          | Next.js 16.2 (App Router, TypeScript, Turbopack)  |
| Styling            | Tailwind CSS v4 + shadcn/ui                       |
| LLM                | Amazon Bedrock — Claude 3.5 Haiku                 |
| Scope Guard L1     | Amazon Bedrock Guardrails (denied topic policies) |
| Scope Guard L2     | System prompt engineering                         |
| Sentiment Analysis | Amazon Comprehend                                 |
| Scraping (primary) | Apify — Amazon Reviews Scraper                    |
| Scraping (backup)  | AWS Lambda + Puppeteer + @sparticuz/chromium      |
| Import (fallback)  | CSV upload / paste                                |
| Charts             | Recharts                                          |
| Storage            | In-memory (prototype)                             |
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

Three-tier fallback for reliability:

1. **Apify** (primary) — Pre-built Amazon scraper, handles anti-bot, pagination, proxy rotation. ~60s for 100 reviews.
2. **AWS Lambda + Puppeteer** (backup) — Headless Chromium via `@sparticuz/chromium`. In the repo under `/lambda/`.
3. **CSV Upload** (always works) — User pastes or uploads review data directly. Supports flexible column names.

## Getting Started

### Prerequisites

- Node.js 20+
- AWS account with Bedrock access (Claude 3.5 Haiku enabled)
- Apify account (free tier: 5 USD/month compute)

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/reviewlens-ai.git
cd reviewlens-ai

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### Configure Environment Variables

```env
# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# Bedrock
BEDROCK_MODEL_ID=anthropic.claude-3-5-haiku-20241022-v1:0
BEDROCK_GUARDRAIL_ID=your_guardrail_id
BEDROCK_GUARDRAIL_VERSION=DRAFT

# Apify
APIFY_API_TOKEN=your_apify_token

# Lambda (optional)
SCRAPER_LAMBDA_URL=https://your-lambda-url.on.aws
```

### Create Bedrock Guardrail

```bash
# Automated setup script
chmod +x scripts/create-guardrail.sh
./scripts/create-guardrail.sh
```

### Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

### Deploy Lambda Scraper (Optional)

```bash
chmod +x scripts/deploy-lambda.sh
LAMBDA_ROLE_ARN=arn:aws:iam::ACCOUNT:role/YOUR_ROLE ./scripts/deploy-lambda.sh
```

## Assumptions

1. **Amazon as target platform** — Most structured review data, well-supported by scraping tools
2. **In-memory storage** — Acceptable for a prototype; production would use DynamoDB
3. **No user authentication** — Per assignment requirements, the app is directly accessible
4. **Bedrock costs** — Claude 3.5 Haiku is ~$0.001/query; total demo cost < $0.50
5. **Apify free tier** — 5 USD/month compute credit is sufficient for demo and evaluation
6. **English reviews only** — Comprehend sentiment analysis configured for English

## What I'd Do With More Time

- **DynamoDB persistence** — Sessions survive server restarts
- **Multi-product comparison** — Compare sentiment across products
- **PDF/CSV export** — Download analysis reports
- **WebSocket real-time** — True real-time streaming via WebSockets
- **Rate limiting** — Protect the Bedrock API from abuse
- **Review pagination** — Handle products with 10,000+ reviews
- **Dark mode toggle** — Already have CSS variables set up for it
- **E2E tests** — Playwright tests for the full flow

---

Built with Next.js 16, Amazon Bedrock, Bedrock Guardrails, Amazon Comprehend, Apify, and Claude Code.
