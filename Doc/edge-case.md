# Edge Cases & Fallback Specifications — Myntra AI Discovery Engine

This document details edge cases, data anomalies, and fallback behaviors handled by the **Myntra AI Discovery Engine**.

---

## 1. Data Ingestion & Schema Edge Cases

| Edge Case | Description | System Handling & Fallback Behavior |
| :--- | :--- | :--- |
| **Generic Product Reviews** | User writes a simple 2-word review e.g. *"good product"* without mentioning wishlist or cart. | Classified as `Post-Purchase Product Feedback` instead of forcing an inaccurate wishlist journey label. |
| **Commas inside CSV Review Text** | Review text contains multiple commas or line breaks. | Parsed using Python's robust `csv.DictReader` to prevent row truncation or shifted columns. |
| **Missing Star Rating** | Review record has no explicit star rating field in raw CSV. | Auto-derived from sentiment: Negative = 1★, Neutral = 3★, Positive = 5★. |
| **Unmentioned 20-Schema Fields** | User statement makes no mention of competitor or external research. | Set strictly to `null` to guarantee Zero-Hallucination Policy compliance. |
| **Duplicate Customer Statements** | Multiple copies of identical reviews scraped across sources. | Deduplicated during Python ingestion (`ingest_real_reviews.py`) based on normalized string hashes. |

---

## 2. API & Model Resilience Edge Cases

| Edge Case | Description | System Handling & Fallback Behavior |
| :--- | :--- | :--- |
| **Groq API Key Missing or Placeholder** | `.env` has no `GROQ_API_KEY` set. | Engine automatically operates in local RAG search mode without throwing HTTP 500 errors. |
| **Groq API Model 404 / Rate Limit** | Specified Groq model is temporarily unavailable. | System catches HTTP errors silently, logs fallback notice, and serves local research synthesis. |
| **Empty Search Filter Result** | User selects rare combination of filters (e.g. 2★ + Tier-2 City + YouTube). | UI displays friendly empty state notice with a **Reset Filters** button. |
