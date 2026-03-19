# AWS Cloud Cost Estimate — ReviewLens AI

## Current Architecture (Prototype)

The project uses **3 active AWS services** in `us-east-1`:

| Service | Pricing Model | Estimated Monthly Cost |
|---|---|---|
| **Amazon Bedrock (Claude Opus 4.6)** | Input: $15/M tokens, Output: $75/M tokens | $5 – $50 |
| **Amazon Comprehend** | Sentiment analysis: $0.0001/unit (100 chars) | $0.50 – $5 |
| **AWS Amplify Hosting** | Build: $0.01/min, Hosting: $0.023/GB served | $1 – $10 |
| **Bedrock Guardrails** | $0.75/1K text units assessed | $0.50 – $5 |

## Assumptions (Prototype / Demo Usage)

- ~50–200 reviews per session, ~50–200 sessions/month
- Average ~2K input tokens + ~1K output tokens per Bedrock call
- ~3–5 chat turns per session
- Low traffic (demo/evaluation use, not production scale)

## Detailed Breakdown

### 1. Amazon Bedrock — Claude Opus 4.6 (Largest Cost)

This is by far the **most expensive** component:

- Per review ingestion call: ~5K–15K input tokens (reviews + system prompt), ~2K output tokens
- Per chat turn: ~3K–8K input tokens (history + context), ~1K output tokens
- **At 100 sessions/month, 5 turns each:**
  - Input: ~100 × (15K + 5×8K) = **~5.5M input tokens → ~$82**
  - Output: ~100 × (2K + 5×1K) = **~0.7M output tokens → ~$52**
  - **Total: ~$134/month** at moderate use

> **Cost-saving tip:** Switching to **Claude Sonnet 4** ($3/$15 per M tokens) would cut this to ~$27/month — an 80% reduction with minimal quality loss for review analysis.

### 2. Amazon Comprehend — Sentiment Analysis

- $0.0001 per unit (1 unit = 100 characters)
- Average review ~500 chars = 5 units → $0.0005/review
- 200 reviews × 100 sessions = 20,000 reviews/month
- **Total: ~$10/month**

### 3. AWS Amplify Hosting

- Build minutes: ~3 min/build × 20 builds/month = $0.60
- Data transfer: ~1 GB/month at $0.023/GB
- SSR compute: included in Amplify's free tier for low traffic
- **Total: ~$1–5/month** (likely within free tier for demo)

### 4. Bedrock Guardrails

- $0.75 per 1,000 text units (1 unit = 1K chars)
- Applied to both input and output of every Bedrock call
- **Total: ~$2–8/month**

## Monthly Cost Summary

| Scenario | Estimated Cost |
|---|---|
| **Light demo use** (~20 sessions/month) | **$15 – $35** |
| **Moderate evaluation** (~100 sessions/month) | **$100 – $180** |
| **Heavy testing** (~500 sessions/month) | **$500 – $900** |

## Free Tier Eligibility

| Service | Free Tier |
|---|---|
| **Amplify** | 1,000 build minutes/month free for 12 months |
| **Comprehend** | 50K units/month free for 12 months |
| **Bedrock** | No free tier for Claude models (on-demand pricing from first request) |

## Key Takeaway

**Amazon Bedrock (Claude Opus 4.6) accounts for ~85% of the total cost.** For a prototype/POC, the most impactful optimization is switching to **Sonnet 4** or using **prompt caching** (if supported) to reduce repeated system prompt costs. At demo-level usage (~20 sessions), expect **~$15–35/month**.
