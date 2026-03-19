# Session 4 — AWS Integration & Permissions
**Date:** 2026-03-18
**AI Tool:** Claude Code (Claude Opus 4.6)
**Duration:** ~20 min

## Objective
Wire up Amazon Comprehend for sentiment analysis and Amazon Bedrock for Q&A, resolve IAM permissions.

## Key Decisions Made with AI

### Comprehend Sentiment Analysis
- **Problem:** `AccessDeniedException` — IAM user lacked `comprehend:BatchDetectSentiment` permission
- **Fix:** Created inline IAM policy via AWS Console with minimal permission scope
- **Fallback:** Rating-based sentiment (≥4 stars = positive, ≤2 = negative) already in place — app works even without Comprehend

### Bedrock Guardrails
- **Setup:** Configured `BEDROCK_GUARDRAIL_ID` and `BEDROCK_GUARDRAIL_VERSION` in .env
- **Dual-layer approach:**
  1. System prompt with strict scope rules and decline templates
  2. Bedrock Guardrails with topic policies for out-of-scope blocking
- **AI helped:** Structure the guardrail error handling — catch both stream-level guardrail events and thrown exceptions

### Bedrock Streaming
- **Model:** Using inference profile ID (not raw model ID) for on-demand access
- **Config:** `maxTokens: 1024`, `temperature: 0.3` for focused analytical responses
- **AI helped:** Implement the `ConverseStreamCommand` async generator with proper event handling for `contentBlockDelta`, `inputAssessment`, and `outputAssessments`

## What Went Well
- Comprehend fallback meant the app never broke — just degraded gracefully
- Guardrail dual-layer gives strong scope enforcement without being brittle
