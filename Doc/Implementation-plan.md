# Implementation Plan — Myntra AI Discovery Engine (Updated Specification)

Build an **AI-powered consumer research and discovery engine specifically tailored for Myntra** to discover **why Indian fashion shoppers add items to their Myntra wishlist but abandon them without completing a purchase within 30 days**.

> **Growth Product Objective:**  
> **Increase the percentage of Myntra users who purchase at least one item from their wishlist within 30 days of adding it.**  
>  
> **Core System Principle:**  
> *"Do not solve the problem. Build a system that discovers the problem."*  
> The engine parses public user conversations (Myntra App Store reviews, Play Store feedback, Indian fashion Reddit subreddits, YouTube Myntra haul comments) to discover recurring purchase barriers, unmet information needs, and cross-platform leakage before any solution is designed.

---

## Recent System Enhancements Incorporated

1. **1 to 5 Star Rating Filter & Distribution:** Extracted star ratings across 4,604 real customer reviews and built multi-select rating checkboxes (`1★`, `2★`, `3★`, `4★`, `5★`) with star badges (`⭐ ⭐ ⭐ ⭐ ⭐`) on evidence cards.
2. **10 Guided Growth Research Questions Dropdown:** Replaced flat search modes with an interactive dropdown containing 10 core product growth research questions for one-click exploration.
3. **Interactive Chart.js Analytics (Click-to-Filter):** Visual graphs (Theme Volume, 1-5★ Rating Distribution, Shopper Segment Share) allow researchers to click any bar or slice to instantly filter the evidence feed.
4. **Expanded 8 Shopper Demographic Personas:** Support for Gen Z / Myntra FWD Trendseekers, Working Professionals, EORS Discount Hunters, Festival/Wedding Shoppers, Plus-Size Fit Shoppers, Tier-2/3 City Shoppers, Brand Loyalists, and Family Apparel Buyers.
5. **Accurate Journey Stage Interpretation:** Standard product reviews without wishlist mentions are accurately identified as `Post-Purchase Product Feedback`, while explicit wishlist interactions receive dedicated journey badges.
6. **Groq Cloud LLM API Integration:** Inference integration with `llama3-70b-8192` for real-time RAG synthesis and zero-shot schema extraction, backed by a local fallback engine.

---

## Proposed Changes — Phase-Wise Implementation Roadmap

```
e:\Myntra search engine/
├── Doc/
│   ├── Problem_Statement.txt       # Original requirement specification
│   ├── Architecture.md             # Architectural specification
│   ├── Implementation-plan.md      # Updated phase-wise implementation plan
│   ├── context.md                  # Business & domain context specification
│   ├── edge-case.md                # Edge case matrix & fallback specifications
│   └── deployment-plan.md          # Production deployment & infrastructure guide
├── package.json                    # Dependencies and test scripts (27 unit tests)
├── server.js                       # Express Web REST API server
├── .env                            # Environment variables (GROQ_API_KEY, GROQ_MODEL)
├── config/
│   └── myntra_scoring_config.json  # Opportunity metrics configuration
├── data/
│   ├── myntra_raw_feedback.json    # Raw feedback dataset
│   └── myntra_extracted_db.json    # 4,604 clean research evidence records
├── engine/
│   ├── schema.js                   # 20-Attribute schema validator + rating field
│   ├── extraction.js               # Behavioral extraction engine
│   ├── ingest_real_reviews.py      # Python dataset ingestion & cleaning pipeline
│   ├── clustering.js               # Theme & sub-theme grouping engine
│   ├── opportunity.js              # Research opportunity matrix engine
│   ├── search_rag.js               # RAG search query engine & counter-evidence analyzer
│   └── groq_api.js                 # Groq Cloud API integration client (llama3-70b-8192)
├── public/
│   ├── index.html                  # Myntra Discovery Engine Dashboard UI
│   ├── styles.css                  # Myntra Dark Slate + Magenta Design System
│   └── app.js                      # Client state controller & Chart.js click-to-filter logic
└── tests/
    ├── test_extraction.js          # Phase 1 Schema Core unit tests (5 tests)
    ├── test_extraction_pipeline.js # Phase 2 Extraction pipeline unit tests (4 tests)
    ├── test_opportunity.js         # Phase 3 Opportunity Engine unit tests (4 tests)
    ├── test_search.js              # Phase 4 RAG Search & Rating Filter unit tests (7 tests)
    ├── test_groq_api.js            # Groq API Integration unit tests (2 tests)
    └── test_server_api.js          # Phase 5 REST API Server unit tests (5 tests)
```

---

### Phase 1: Schema Core & Zero-Hallucination Policy
- Implemented 20-attribute schema in [engine/schema.js](file:///e:/Myntra%20search%20engine/engine/schema.js) with `rating` (1-5 star integer) and `null` fallbacks.
- Verified via `tests/test_extraction.js` (5/5 tests passed).

### Phase 2: Ingestion & Dataset Cleaning Pipeline
- Developed Python ingestion engine [engine/ingest_real_reviews.py](file:///e:/Myntra%20search%20engine/engine/ingest_real_reviews.py) processing App Store CSVs, Play Store CSVs, Reddit threads, and YouTube comments.
- Cleaned 8,429 raw records, removed 4,088 duplicates & 283 non-informative generic phrases, retaining **4,604 clean, rated research evidence records**.
- Verified via `tests/test_extraction_pipeline.js` (4/4 tests passed).

### Phase 3: Research Themes & Friction Discovery Map
- Grouped customer feedback into distinct research themes (*Fit & Size Silhouette Uncertainty*, *Review Trust & Fabric Quality*, *App Leakage*, *Price & EORS Discount Expectation*, *Return Policy Concerns*, *Wishlist Overload*).
- Formulated evidence volume counts and component metrics in [engine/opportunity.js](file:///e:/Myntra%20search%20engine/engine/opportunity.js).
- Verified via `tests/test_opportunity.js` (4/4 tests passed).

### Phase 4: Guided Research Engine & Counter-Evidence Analyzer
- Built [engine/search_rag.js](file:///e:/Myntra%20search%20engine/engine/search_rag.js) supporting guided growth question queries, star rating filters (1-5★), source filters, and segment filters.
- Implemented **Disconfirming Counter-Evidence Analyzer** to surface disconfirming examples (e.g. users converting at full price or discounts failing to overcome fit doubts).
- Verified via `tests/test_search.js` (7/7 tests passed).

### Phase 5: Groq API Integration & REST Backend Server
- Built Express server in [server.js](file:///e:/Myntra%20search%20engine/server.js) with REST endpoints (`/api/search`, `/api/opportunities`, `/api/evidence`, `/api/segments`, `/api/health`, `/api/stats`, `/api/ingest`).
- Integrated Groq Cloud LLM API in [engine/groq_api.js](file:///e:/Myntra%20search%20engine/engine/groq_api.js) (`llama3-70b-8192`).
- Verified via `tests/test_groq_api.js` (2 tests) and `tests/test_server_api.js` (5 tests).

### Phase 6: Interactive Myntra Web Dashboard UI
- Implemented glassmorphic UI in [public/index.html](file:///e:/Myntra%20search%20engine/public/index.html), [public/styles.css](file:///e:/Myntra%20search%20engine/public/styles.css), and [public/app.js](file:///e:/Myntra%20search%20engine/public/app.js).
- Added 10 guided research questions dropdown, 1-5 star rating filter, 8 shopper personas, interactive Chart.js graphs (click-to-filter), color-coded journey badges, and slide-over drawer.

### Phase 7: Verification & Walkthrough
- Executed `npm test` covering all **27 unit tests across 6 test suites with 100% pass rate**.
- Documented findings and execution steps in [walkthrough.md](file:///e:/Myntra%20search%20engine/walkthrough.md).
