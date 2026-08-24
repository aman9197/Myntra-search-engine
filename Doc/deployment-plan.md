# Deployment & Infrastructure Plan — Myntra AI Discovery Engine

## 1. Environment Requirements

- **Runtime:** Node.js v18+ & Python 3.9+
- **Database:** In-memory JSON database loaded from `data/myntra_extracted_db.json` (4,604 clean research records).
- **Environment Configuration ([.env](file:///e:/Myntra%20search%20engine/.env)):**
  ```env
  PORT=3000
  NODE_ENV=production
  GROQ_API_KEY=gsk_your_actual_groq_api_key_here
  GROQ_MODEL=llama3-70b-8192
  CORS_ORIGIN=*
  ```

---

## 2. Production Deployment Steps

1. **Clone Repository & Install Dependencies:**
   ```bash
   npm install
   ```

2. **Ingest & Clean Review Datasets:**
   ```bash
   python engine/ingest_real_reviews.py
   ```

3. **Execute Automated Verification Suite (27 Tests):**
   ```bash
   npm test
   ```

4. **Start Production Express Server:**
   ```bash
   npm start
   ```

5. **Verify Live Access:**
   - Web Dashboard: `http://localhost:3000`
   - Health Check: `http://localhost:3000/api/health`
