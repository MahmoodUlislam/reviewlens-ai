# Session 9 — Amplify Deployment Debugging
**Date:** 2026-03-19
**AI Tool:** Claude Code (Claude Opus 4.6)
**Duration:** ~30 min

## Objective
Diagnose and fix production failures on AWS Amplify where Apify scraping, Bedrock chat, and Comprehend sentiment analysis all failed despite working locally.

## Issues Found & Fixed (3 total)

### Issue 1: Apify Token Not Available at Runtime
- **Symptom:** `APIFY_API_TOKEN not configured` error on deployed app
- **Root Cause:** Amplify env vars are available during the **build step** but not automatically at **SSR runtime** for Next.js API routes
- **Fix:** Updated `amplify.yml` to write env vars into `.env.production` during build:
  ```yaml
  - env | grep -E '^(BEDROCK_|APIFY_)' >> .env.production
  ```
- **Also noted:** `APIFY_API_TOKEN` was only set for `main` branch, not "All branches" — moved to app-level scope

### Issue 2: Missing Bedrock Converse API Permissions
- **Symptom:** Chat API returned generic error after Apify fix
- **Root Cause:** IAM policy on `AmplifyReviewLensRole` had `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream` but the code uses `ConverseStreamCommand`, which requires **different IAM actions**: `bedrock:Converse` and `bedrock:ConverseStream`
- **Fix:** Updated the inline policy via CLI:
  ```bash
  aws iam put-role-policy --role-name AmplifyReviewLensRole \
    --policy-name BedrockComprehendAccess \
    --policy-document '{ ... "bedrock:Converse", "bedrock:ConverseStream" ... }'
  ```
- **Also updated** the trust policy to include `lambda.amazonaws.com` and `edgelambda.amazonaws.com` alongside `amplify.amazonaws.com`

### Issue 3: No AWS Credentials in SSR Runtime
- **Symptom:** `[DEBUG] Could not load credentials from any providers`
- **Debugging approach:** Temporarily exposed the actual Bedrock error message in the SSE stream instead of the generic "An error occurred" message — deployed, reproduced, read the real error, then reverted
- **Root Cause:** Amplify Hosting `WEB_COMPUTE` platform uses the service role only for **deployment operations** (e.g., pulling code, writing artifacts). The SSR runtime (Next.js API routes) does **not** inherit the service role's credentials. Unlike EC2 or Lambda with execution roles, the SSR compute has no implicit AWS credentials
- **Why localhost works:** The AWS SDK credentials chain checks `~/.aws/credentials` (from `aws configure`), which exists locally but not in Amplify's SSR environment
- **Fix:**
  1. Added `MY_AWS_ACCESS_KEY_ID`, `MY_AWS_SECRET_ACCESS_KEY`, and `MY_AWS_REGION` to Amplify env vars (Amplify blocks the `AWS_` prefix)
  2. Updated `amplify.yml` to remap them during build:
     ```yaml
     - echo "AWS_ACCESS_KEY_ID=$MY_AWS_ACCESS_KEY_ID" >> .env.production
     - echo "AWS_SECRET_ACCESS_KEY=$MY_AWS_SECRET_ACCESS_KEY" >> .env.production
     - echo "AWS_REGION=$MY_AWS_REGION" >> .env.production
     ```
- **Updated `.env.example`** to document the credentials chain behavior and the Amplify workaround

## Amplify Environment Variable Scoping
Discovered that Amplify has two scopes for env vars:
- **All branches** — applies to every branch/deploy
- **Branch-specific** (e.g., `main`) — overrides "All branches" for that branch

The user had duplicate entries across both scopes. Consolidated all vars under "All branches" for clarity.

## Key Debugging Technique
When no CloudWatch logs are available (Amplify SSR has no visible log groups), temporarily expose the actual error in the API response:
```typescript
content: `[DEBUG] ${errorMessage}`  // instead of generic error
```
Deploy, reproduce, read the real error, then revert. This saved significant time vs. guessing.

## What Went Well
- Systematic elimination: Apify → IAM actions → credentials, each fix revealed the next layer
- Debug error exposure technique gave the exact root cause in one deploy cycle
- CLI-driven IAM policy updates avoided manual console clicking

## Dead Ends
- Searched for Lambda functions backing Amplify SSR — none exist; `WEB_COMPUTE` uses Amplify's own managed compute, not Lambda
- Searched for CloudWatch log groups — none exist for this app; Amplify SSR logging wasn't configured
- Tried `useRef` pattern for SSR rendering — blocked by React 19 lint (used `useState` lazy init instead, from Session 8)
- Attempted to set `AWS_*` env vars directly in Amplify Console — blocked by reserved prefix restriction

## Files Modified

| File | Changes |
|------|---------|
| `amplify.yml` | Write all env vars (including remapped AWS credentials) to `.env.production` during build |
| `src/app/api/chat/route.ts` | Temporarily exposed debug error, then reverted to generic message |
| `.env.example` | Documented AWS credentials chain behavior and Amplify workaround |
