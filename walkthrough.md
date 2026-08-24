# Walkthrough — Myntra AI Discovery Engine

The **Myntra AI Discovery Engine** is fully implemented and operational. It is built to discover **why Indian fashion shoppers add items to their Myntra wishlist but abandon them without completing a purchase within 30 days**.

> **Growth Product Motto:**  
> *"Do not solve the problem. Build a system that discovers the problem."*

---

## 1. System Overview & Accomplishments

- **Structured AI Schema & Zero-Hallucination Core:** Implemented the strict 20-attribute extraction schema (Section 9 of `Problem_Statement.txt`) in [engine/schema.js](file:///e:/Myntra%20search%20engine/engine/schema.js) with `null` fallbacks.
- **Dataset Ingestion & Cleaning:** Processed real App Store & Play Store review files in `Data/`. Removed duplicates and 283 non-informative ratings, retaining **4,058 high-quality 20-attribute research evidence records** (3.67 MB database).
- **Opportunity Evidence Engine:** Implemented multi-dimensional Opportunity Evidence Scoring ($F \times S \times P \times W \times E$) in [engine/opportunity.js](file:///e:/Myntra%20search%20engine/engine/opportunity.js) with severity overrides ($S \ge 9.0$) and segment breakdown logic.
- **4-Mode RAG Search Engine & Counter-Evidence Core:** Created [engine/search_rag.js](file:///e:/Myntra%20search%20engine/engine/search_rag.js) supporting **Explore**, **Compare**, **Segment**, and **Evidence** search modes with automatic disconfirming evidence extraction.
- **Groq Cloud API Integration:** Configured Groq API client in [engine/groq_api.js](file:///e:/Myntra%20search%20engine/engine/groq_api.js) supporting models like `llama-3.3-70b-versatile` via `.env` configuration.
- **REST API Backend Server:** Implemented Express backend in [server.js](file:///e:/Myntra%20search%20engine/server.js) running on `http://localhost:3000`.
- **Myntra Dark + Magenta Web UI:** Created glassmorphic Web Dashboard in [public/index.html](file:///e:/Myntra%20search%20engine/public/index.html), [public/styles.css](file:///e:/Myntra%20search%20engine/public/styles.css), and [public/app.js](file:///e:/Myntra%20search%20engine/public/app.js).

---

## 2. API Endpoints Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/search` | `GET` | Executes 4-mode RAG search (`mode=explore|compare|segment|evidence`) with multi-facet filters and optional Groq LLM synthesis. |
| `/api/opportunities` | `GET` | Returns ranked Opportunity Evidence Matrix and breakdown table with custom weight support. |
| `/api/evidence` | `GET` | Returns paginated evidence feed with theme/segment filters. |
| `/api/segments` | `GET` | Returns shopper demographic segment breakdowns. |
| `/api/ingest` | `POST` | Ingests new raw customer statements into the discovery engine. |
| `/api/groq/extract` | `POST` | Runs Groq Cloud LLM 20-attribute schema extraction on raw text. |

---

## 3. Automated Test Verification Results

All 21 automated unit tests across 5 test suites passed cleanly (`npm test`):

```text
--------------------------------------------------
RUNNING PHASE 1 TEST SUITE: Schema Core Validation
--------------------------------------------------
✓ PASS: Should correctly validate and normalize a complete 20-attribute record
✓ PASS: Should enforce strict null fallback for unmentioned attributes
✓ PASS: Should sanitize string "null", empty strings, and empty arrays to null
✓ PASS: Should correctly derive evidence strength based on first-person statement vs general commentary
✓ PASS: Should throw an error if record text is missing or empty
--------------------------------------------------
RESULTS: 5/5 tests passed.

--------------------------------------------------
RUNNING PHASE 2 TEST SUITE: Extraction Pipeline
--------------------------------------------------
✓ PASS: Should extract structured evidence from raw customer text
✓ PASS: Should ingest myntra_raw_feedback.json and produce valid myntra_extracted_db.json
✓ PASS: Should correctly classify Gen Z FWD segment and journey stages
✓ PASS: Should extract successful conversion and positive sentiment for purchase events
--------------------------------------------------
RESULTS: 4/4 tests passed.

--------------------------------------------------
RUNNING PHASE 3 TEST SUITE: Opportunity Engine
--------------------------------------------------
✓ PASS: Should cluster evidence records into distinct opportunity themes
✓ PASS: Should calculate Opportunity Scores and component breakdown metrics
✓ PASS: Should apply minimum score override when severity >= 9.0
✓ PASS: Should process real research DB and calculate ranked opportunity matrix
--------------------------------------------------
RESULTS: 4/4 tests passed.

--------------------------------------------------
RUNNING PHASE 4 TEST SUITE: 4-Mode RAG Search Core
--------------------------------------------------
✓ PASS: Should execute Mode 1 (Explore) and return structured research summary
✓ PASS: Should execute Mode 2 (Compare) and generate delta analysis between themes
✓ PASS: Should execute Mode 3 (Segment) and contrast friction across demographic segments
✓ PASS: Should execute Mode 4 (Evidence) and return high-confidence direct quotes
✓ PASS: Should detect disconfirming counter-evidence to eliminate confirmation bias
✓ PASS: Should apply source and segment filters accurately
--------------------------------------------------
RESULTS: 6/6 tests passed.

--------------------------------------------------
RUNNING GROQ API INTEGRATION TEST SUITE
--------------------------------------------------
✓ PASS: Should configure default Groq model as llama-3.3-70b-versatile
✓ PASS: Should handle fallback mode gracefully if GROQ_API_KEY is placeholder
--------------------------------------------------
RESULTS: 2/2 tests passed.
--------------------------------------------------
TOTAL: 21/21 Unit Tests Passed Successfully!
```

---

## 4. How to Run the Application

1. **Configure Groq API Key (Optional):**  
   Edit [.env](file:///e:/Myntra%20search%20engine/.env) and set your key:  
   `GROQ_API_KEY=gsk_your_actual_groq_key_here`  
   *(If not set, the system seamlessly operates in high-speed local engine fallback mode).*

2. **Start the Express Server:**  
   ```bash
   npm start
   ```

3. **Access the Web Dashboard:**  
   Open your browser at `http://localhost:3000`.
