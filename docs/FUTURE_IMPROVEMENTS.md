# ReviewLens AI — Future Improvements

## Current Prototype Approach

For this prototype, ReviewLens AI uses **direct LLM invocation via Amazon Bedrock Converse API** with a carefully engineered system prompt and Bedrock Guardrails for scope enforcement. This approach is intentional:

- Reviews (~50-200) fit comfortably within Claude Opus 4.6's 200K token context window
- System prompt engineering is transparent and auditable — evaluators can inspect exactly how scope guarding works
- Minimal infrastructure overhead — no additional AWS services beyond Bedrock and Comprehend
- Conversation history is maintained client-side and sent with each request for multi-turn context
- Streaming responses via Bedrock ConverseStream API for real-time UX

This is sufficient and performant for the prototype's review volume. The following improvements would be necessary for a production-scale system.

### Deployment: AWS Amplify

The Next.js application is deployed using **AWS Amplify Hosting**. Amplify was chosen because it keeps the entire stack within a single AWS cloud infrastructure — the frontend, Bedrock, Comprehend, and all future services (Cognito, DynamoDB, S3, API Gateway) live under one AWS account. This simplifies IAM permissions, networking, billing, and is recommended when the goal is a unified AWS-native architecture with a clear path to production-grade security and authentication (e.g., Cognito + Amplify Auth, VPC endpoints, WAF).

**Alternative:** Vercel can also be used to deploy the Next.js application. Vercel offers an excellent developer experience with zero-config deployments, edge functions, and built-in analytics. It is a viable option especially if the team prefers a managed frontend platform decoupled from AWS infrastructure.

---

## Phase 1: Amazon Bedrock Agent Architecture

### Why
When review volume exceeds the context window (~10,000+ reviews), injecting all reviews into the system prompt becomes impractical. A Bedrock Agent with a Knowledge Base enables retrieval-augmented generation (RAG) — the agent retrieves only the most relevant reviews for each query.

### Implementation
- **Bedrock Agent** — Orchestrates multi-step reasoning, maintains conversation state server-side, and manages tool invocations
- **Bedrock Knowledge Base** — Reviews stored in S3, indexed via OpenSearch Serverless vector store. Agent retrieves semantically relevant reviews per query instead of loading all reviews into context
- **Action Groups** — Lambda-backed actions for structured operations:
  - `SearchReviews` — Filter reviews by rating, date range, keyword
  - `GetAnalytics` — Return sentiment breakdown, rating distribution
  - `ExportReport` — Generate PDF/CSV analysis reports
  - `CompareTimePeriods` — Compare sentiment across date ranges
- **Guardrails** — Attached at the agent level (same guardrail, applied automatically to every invocation)

### Architecture
```
User Query
    │
    ▼
┌──────────────────────────────┐
│  Amazon Bedrock Agent         │
│  ┌────────────────────────┐  │
│  │ Guardrails (attached)  │  │
│  └───────────┬────────────┘  │
│              │               │
│  ┌───────────▼────────────┐  │
│  │ Knowledge Base (RAG)   │  │
│  │ S3 → OpenSearch Vector │  │
│  └───────────┬────────────┘  │
│              │               │
│  ┌───────────▼────────────┐  │
│  │ Action Groups          │  │
│  │ - SearchReviews        │  │
│  │ - GetAnalytics         │  │
│  │ - ExportReport         │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
    │
    ▼
Streaming Response with Citations
```

### Benefits
- Handles 100,000+ reviews without context window limits
- Built-in citation from Knowledge Base retrieval
- Server-side conversation memory (no need to send full history each request)
- Native multi-step reasoning (agent can search → analyze → summarize in one turn)
- Automatic guardrail enforcement at agent level

---

## Phase 2: Data Persistence & Multi-Tenancy

### DynamoDB for Session Persistence
- Replace in-memory store with DynamoDB
- Sessions survive server restarts and support horizontal scaling
- TTL-based auto-expiry for sessions (e.g., 24-hour retention)
- Table design: `PK: sessionId`, `SK: reviewId` for efficient per-review access

### S3 for Review Storage
- Raw review data stored in S3 (input for Knowledge Base)
- Processed analytics cached as JSON in S3
- Pre-signed URLs for CSV/PDF export downloads

### Multi-Tenancy
- Separate Knowledge Base per product/entity for strict data isolation
- API Gateway with usage plans for rate limiting per client

---

## Phase 3: Advanced Analytics

### Real-Time Sentiment Tracking
- Amazon Kinesis Data Stream for continuous review ingestion
- Kinesis Data Firehose → S3 → Glue Crawler → Athena for trend queries
- CloudWatch dashboards for sentiment drift alerting

### Topic Modeling
- Amazon Comprehend custom entity recognition for product-specific themes
- Automatic topic clustering using Comprehend topic modeling API
- Visualization of topic evolution over time

### Comparative Analysis
- Multi-product comparison within the same platform
- Cross-period sentiment comparison (Q1 vs Q2, pre-launch vs post-launch)
- Automated insight generation: "Sentiment dropped 15% after firmware update on Jan 5"

---

## Phase 4: Production Hardening

### Network & Security Architecture

The current prototype deploys directly on AWS Amplify as a publicly accessible application — no VPC, no authentication, no API Gateway. This is intentional for a rapid prototype with zero-auth requirements.

In production, the architecture would be significantly hardened:

- **VPC with private subnets** — All compute (ECS/Lambda) runs in private subnets with no direct internet access
- **Application Load Balancer (ALB)** or **Network Load Balancer (NLB)** — ALB for HTTP/HTTPS traffic with SSL termination, path-based routing, and WAF integration. NLB if low-latency TCP/WebSocket connections are needed for real-time streaming
- **API Gateway** — RESTful API management with usage plans, throttling, request validation, and API key management. Acts as the single entry point for all backend services
- **Amazon Cognito** — User authentication with Amplify Auth integration. Supports MFA, social sign-in, and custom auth flows. RBAC via Cognito Groups (e.g., Analyst, Admin roles)
- **Amplify Auth** — Client-side auth UI components integrated with Cognito for seamless sign-up/sign-in flows
- **VPC Endpoints** — Private connectivity to Bedrock and Comprehend (no traffic over public internet)
- **AWS Secrets Manager** — All API keys and credentials stored securely (replace environment variables)
- **WAF (Web Application Firewall)** — Attached to ALB/API Gateway for SQL injection, XSS, and bot protection

### Observability
- X-Ray tracing across Lambda, Bedrock, Comprehend calls
- CloudWatch Logs with structured JSON logging
- Custom CloudWatch metrics: latency per API, guardrail intervention rate, token usage
- Bedrock model invocation logging enabled for audit trail

### CI/CD
- AWS CDK infrastructure-as-code for all resources
- GitHub Actions pipeline: lint → test → build → deploy to Amplify
- Staging environment with separate Bedrock guardrail configuration
- Automated E2E tests with Playwright

### Cost Optimization
- Bedrock Provisioned Throughput for predictable latency at scale
- CloudFront caching for static dashboard data
- Lambda reserved concurrency for scraper to prevent cold starts
- S3 Intelligent-Tiering for archived review data

---

## Phase 5: Real-Time Streaming & Multi-Platform Support

### WebSocket for Real-Time Chat Streaming

- Replace HTTP-based streaming with **WebSocket connections** (via API Gateway WebSocket API or ALB) for real-time chat response streaming
- Enables true bidirectional communication — the server pushes tokens as they are generated, reducing perceived latency and improving UX
- Benefits: lower overhead per message compared to HTTP streaming, persistent connection avoids repeated TLS handshakes, and enables server-initiated updates (e.g., progress indicators during long analyses)
- Implementation: API Gateway WebSocket API → Lambda (connect/disconnect/message handlers) → Bedrock ConverseStream, with DynamoDB for connection state management

### Multi-Platform Review Ingestion

- Extend review ingestion beyond the current supported platforms to handle additional sources based on business needs (e.g., Google Play, App Store, Trustpilot, G2, Capterra, Yelp)
- Platform-agnostic ingestion pipeline: each platform gets a dedicated adapter/parser that normalizes reviews into a common schema (reviewer, rating, date, text, platform metadata)
- Configurable platform registry — new platforms can be added without code changes by defining scraping/API rules in a configuration layer
- Unified analytics across platforms: compare sentiment and themes for the same product across different review sources

### Vision-Based Scraping (Alternative to Web Scraping)

- Replace traditional web scraping and third-party scraping services (e.g., Apify) with a **vision-based approach** using a browser extension like **GoFullPage** (or similar) to capture full-page screenshots of review pages
- Feed the captured screenshots into a **vision model** (e.g., Claude's vision capabilities via Bedrock) to extract structured review data (reviewer name, rating, date, review text) directly from the image
- **Advantages over traditional scraping:**
  - No dependency on DOM structure — immune to website layout changes that break CSS/XPath selectors
  - No need for third-party scraping services or API costs
  - Works on pages with heavy JavaScript rendering, anti-bot protections, or dynamic content that is difficult to scrape programmatically
  - Simpler maintenance — no scraper code to update when platforms change their HTML
- Could be implemented as a browser extension workflow: user navigates to review page → extension captures full-page screenshot → uploads image to ReviewLens → vision model extracts and normalizes review data
