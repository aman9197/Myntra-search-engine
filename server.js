/**
 * Express REST API & Web Server for Myntra AI Discovery Engine (Phase 5 Full Implementation).
 * Exposes research search endpoints, opportunity scoring APIs, dataset ingestion,
 * weight configurations, health check, and Groq API endpoints.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { executeRAGSearch } = require('./engine/search_rag');
const { calculateOpportunityScores } = require('./engine/opportunity');
const { extractEvidenceFromRawText } = require('./engine/extraction');
const { extractEvidenceWithGroq, synthesizeWithGroq, DEFAULT_MODEL } = require('./engine/groq_api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Database File Paths
const RESEARCH_DB_PATH = path.join(__dirname, 'data/myntra_extracted_db.json');
const RAW_FEEDBACK_PATH = path.join(__dirname, 'data/myntra_raw_feedback.json');
const CONFIG_PATH = path.join(__dirname, 'config/myntra_scoring_config.json');

// Memory Cache for Database & Config
let researchDatabase = [];
let scoringConfig = {};

function loadDatabase() {
  const candidatePaths = [
    path.join(__dirname, 'data/myntra_extracted_db.json'),
    path.join(process.cwd(), 'data/myntra_extracted_db.json'),
    path.join(__dirname, 'Data/myntra_extracted_db.json'),
    path.join(process.cwd(), 'Data/myntra_extracted_db.json')
  ];

  let loaded = false;
  for (const dbPath of candidatePaths) {
    if (fs.existsSync(dbPath)) {
      try {
        researchDatabase = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        console.log(`Loaded ${researchDatabase.length} research evidence records from ${dbPath}`);
        loaded = true;
        break;
      } catch (e) {
        console.error(`Error reading ${dbPath}: ${e.message}`);
      }
    }
  }

  if (!loaded) {
    console.warn('Research database file not found in candidate paths. Initializing empty DB.');
    researchDatabase = [];
  }

  const configCandidates = [
    path.join(__dirname, 'config/myntra_scoring_config.json'),
    path.join(process.cwd(), 'config/myntra_scoring_config.json')
  ];

  for (const cfgPath of configCandidates) {
    if (fs.existsSync(cfgPath)) {
      try {
        scoringConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        break;
      } catch (e) {}
    }
  }
}

loadDatabase();

/* -------------------------------------------------------------------------- */
/*                                API ENDPOINTS                               */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/health
 * Returns server diagnostics and database state.
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    records_loaded: researchDatabase.length,
    groq_api_configured: Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'gsk_your_groq_api_key_here'),
    groq_model: DEFAULT_MODEL
  });
});

/**
 * GET /api/stats
 * Summary statistics of evidence records by source, segment, and category.
 */
app.get('/api/stats', (req, res) => {
  const sources = {};
  const segments = {};
  const categories = {};
  const themes = {};

  researchDatabase.forEach(r => {
    sources[r.source || 'Other'] = (sources[r.source || 'Other'] || 0) + 1;
    segments[r.user_segment || 'General'] = (segments[r.user_segment || 'General'] || 0) + 1;
    categories[r.fashion_category || 'General'] = (categories[r.fashion_category || 'General'] || 0) + 1;
    themes[r.theme || 'General'] = (themes[r.theme || 'General'] || 0) + 1;
  });

  res.json({
    success: true,
    total_records: researchDatabase.length,
    sources_distribution: sources,
    segments_distribution: segments,
    categories_distribution: categories,
    themes_distribution: themes
  });
});

/**
 * GET /api/search
 * Executes 4-Mode RAG Search Query with multi-facet filters.
 */
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const mode = req.query.mode || 'explore';
    const sources = req.query.source ? req.query.source.split(',') : [];
    const segments = req.query.segment ? req.query.segment.split(',') : [];
    const categories = req.query.category ? req.query.category.split(',') : [];
    const ratings = req.query.rating ? req.query.rating.split(',').map(r => parseInt(r.trim(), 10)).filter(n => !isNaN(n)) : [];

    const filters = { sources, segments, categories, ratings };

    const searchResult = executeRAGSearch(query, mode, filters, researchDatabase);

    // If Groq API key is configured and user query exists, enhance finding with Groq LLM synthesis
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'gsk_your_groq_api_key_here' && query.length > 5) {
      try {
        const groqInsight = await synthesizeWithGroq(query, searchResult.evidence_feed);
        if (groqInsight) {
          searchResult.finding = `${searchResult.finding}\n\n[Groq AI Insights (${DEFAULT_MODEL})]: ${groqInsight}`;
          searchResult.ai_powered_by = `Groq Cloud (${DEFAULT_MODEL})`;
        }
      } catch (err) {
        console.warn(`Groq synthesis skipped: ${err.message}`);
      }
    }

    res.json({ success: true, ...searchResult });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/opportunities
 * Returns ranked Opportunity Evidence Matrix and breakdown table.
 */
app.get('/api/opportunities', (req, res) => {
  try {
    const customWeights = req.query.weights ? JSON.parse(req.query.weights) : null;
    const opportunities = calculateOpportunityScores(researchDatabase, customWeights);
    res.json({
      success: true,
      total_records: researchDatabase.length,
      config: scoringConfig.weights,
      opportunities: opportunities
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/evidence
 * Returns paginated evidence feed with filters.
 */
app.get('/api/evidence', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const theme = req.query.theme || null;
    const segment = req.query.segment || null;

    let filtered = researchDatabase;
    if (theme) filtered = filtered.filter(r => r.theme === theme);
    if (segment) filtered = filtered.filter(r => r.user_segment === segment);

    const total = filtered.length;
    const startIdx = (page - 1) * limit;
    const paginated = filtered.slice(startIdx, startIdx + limit);

    res.json({
      success: true,
      total: total,
      page: page,
      total_pages: Math.ceil(total / limit),
      evidence: paginated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/evidence/theme/:themeName
 * Returns evidence specific to an opportunity theme.
 */
app.get('/api/evidence/theme/:themeName', (req, res) => {
  try {
    const themeName = decodeURIComponent(req.params.themeName);
    const matching = researchDatabase.filter(r => r.theme && r.theme.toLowerCase() === themeName.toLowerCase());
    res.json({
      success: true,
      theme: themeName,
      total: matching.length,
      evidence: matching.slice(0, 50)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/segments
 * Returns breakdown of shopper segments and friction topics.
 */
app.get('/api/segments', (req, res) => {
  try {
    const segmentMap = {};
    researchDatabase.forEach(r => {
      const seg = r.user_segment || 'General Shoppers';
      if (!segmentMap[seg]) {
        segmentMap[seg] = { segment: seg, count: 0, barriers: {} };
      }
      segmentMap[seg].count++;
      const barrier = r.purchase_barrier || 'Unspecified';
      segmentMap[seg].barriers[barrier] = (segmentMap[seg].barriers[barrier] || 0) + 1;
    });

    res.json({ success: true, segments: Object.values(segmentMap) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/config/weights
 * Dynamically updates Opportunity Score weight configurations.
 */
app.post('/api/config/weights', (req, res) => {
  try {
    const newWeights = req.body;
    if (!newWeights || typeof newWeights !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid body: weights object required' });
    }

    scoringConfig.weights = { ...scoringConfig.weights, ...newWeights };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(scoringConfig, null, 2));

    const updatedOpportunities = calculateOpportunityScores(researchDatabase, scoringConfig.weights);

    res.json({
      success: true,
      message: 'Scoring weights updated successfully.',
      weights: scoringConfig.weights,
      opportunities: updatedOpportunities
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ingest
 * Ingests new raw customer statements into the discovery engine.
 */
app.post('/api/ingest', (req, res) => {
  try {
    const rawItem = req.body;
    if (!rawItem || !rawItem.text) {
      return res.status(400).json({ success: false, error: 'Request body must contain a "text" field' });
    }

    const extracted = extractEvidenceFromRawText(rawItem);
    researchDatabase.unshift(extracted);

    // Save back to disk
    fs.writeFileSync(RESEARCH_DB_PATH, JSON.stringify(researchDatabase, null, 2));

    res.json({
      success: true,
      message: 'Statement successfully ingested and shaped into 20-attribute evidence record.',
      extracted_record: extracted
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/groq/extract
 * Extracts 20-attribute research schema directly using Groq LLM API.
 */
app.post('/api/groq/extract', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text field is required' });
    }

    const groqResult = await extractEvidenceWithGroq(text);
    if (!groqResult) {
      const localResult = extractEvidenceFromRawText({ text });
      return res.json({ success: true, source: 'local_engine_fallback', record: localResult });
    }

    res.json({ success: true, source: `groq_cloud_${DEFAULT_MODEL}`, record: groqResult });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Express Server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`Myntra AI Discovery Engine Server running on port ${PORT}`);
    console.log(`Local Access: http://localhost:${PORT}`);
    console.log(`Groq API Key Configured: ${process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'gsk_your_groq_api_key_here' ? 'Yes (' + DEFAULT_MODEL + ')' : 'No (Local Engine Fallback)'}`);
    console.log(`==================================================`);
  });
}

module.exports = app;
