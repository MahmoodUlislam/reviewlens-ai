# Session 2 — Scraping & Ingestion Pipeline
**Date:** 2026-03-18
**AI Tool:** Claude Code (Claude Opus 4.6)
**Duration:** ~30 min

## Objective
Build the review ingestion pipeline — URL scraping via Apify and CSV upload fallback.

## Key Decisions Made with AI

### Apify Integration
- **Problem:** `apify-client` SDK caused `MODULE_NOT_FOUND` errors under Turbopack due to dynamic `require()` calls
- **AI suggested:** Replace SDK with direct REST API calls using `fetch` — eliminated the dynamic import issue entirely
- **Result:** Removed `apify-client` dependency (40 packages), zero Turbopack conflicts

### Overall Rating Scraping
- **Problem:** App showed "Average Rating 4.9/5" computed from scraped sample, but Amazon shows "4.7/5" from 27,405 ratings
- **Decision:** Scrape the product page HTML in parallel with review scraping to extract the real overall rating and total global ratings count
- **Implementation:** Lightweight `fetch` of the product page, regex extraction of "X out of 5 stars" and "N global ratings"

### CSV Parser
- **AI helped:** Generate a robust CSV parser handling quoted fields, various column name mappings (rating/stars, body/text/review), and edge cases

## What Went Well
- Parallel fetching (overall rating + Apify reviews) kept ingestion fast
- Fallback chain (scrape → CSV) gives users a reliable path regardless of anti-bot measures

## Dead Ends
- Lambda/Puppeteer scraper was scaffolded but removed — added complexity without value for the POC timeline
