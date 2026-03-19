# Session 1 — Architecture & Project Scaffolding
**Date:** 2026-03-18
**AI Tool:** Claude Code (Claude Opus 4.6)
**Duration:** ~45 min

## Objective
Design and scaffold the ReviewLens AI project — a review intelligence portal with guardrailed Q&A.

## Key Decisions Made with AI

### Stack Selection
- **Prompt:** "Build a review intelligence portal using AWS services, Next.js, and keep costs at zero."
- **Decision:** Next.js 16 (App Router) + Amazon Bedrock (Claude via ConverseStream API) + Amazon Comprehend + Apify for scraping
- **Rationale:** Leverages existing AWS credentials, free-tier Comprehend, Bedrock pay-per-token model

### Architecture
- **Prompt:** "How should I structure the data flow from ingestion to Q&A?"
- **Decision:** Ingest → Scrape/Parse → Comprehend Sentiment → In-memory session store → Bedrock streaming Q&A
- **Trade-off discussed:** In-memory store vs DynamoDB — chose in-memory for zero-cost POC, noted DynamoDB as production path

### Guardrail Strategy
- **Prompt:** "I need dual-layer scope guard — system prompt + Bedrock Guardrails"
- **Decision:** System prompt enforces review-only scope with decline templates; Bedrock Guardrails adds topic-level blocking as second layer
- **AI helped:** Draft the system prompt with strict rules, decline templates, and review citation requirements

## What Went Well
- AI quickly generated the project structure following Next.js 16 conventions
- Component breakdown (IngestForm, StatsCards, ChatInterface, etc.) was clean from the start

## Dead Ends
- Initially considered Puppeteer Lambda for scraping — decided to defer and use Apify first for faster iteration
