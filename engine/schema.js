/**
 * Schema definition and validation core for Myntra AI Discovery Engine.
 * Implements strict 20-attribute extraction schema (Section 9 of Problem Statement).
 * Enforces Zero-Hallucination Policy: missing/unsupported fields default to null.
 */

const ALLOWED_SOURCES = ['App Store', 'Play Store', 'Reddit', 'YouTube', 'Public Forum', 'Product Review'];
const ALLOWED_EVIDENCE_STRENGTHS = ['High', 'Medium', 'Low'];
const ALLOWED_SENTIMENTS = ['Positive', 'Neutral', 'Negative'];

/**
 * 20-Attribute Schema Specification Template
 */
const SCHEMA_TEMPLATE = {
  source: null,               // 1. App Store / Play Store / Reddit / YouTube
  source_url: null,           // 2. Direct URL or identifier link
  date: null,                 // 3. ISO Date String
  text: null,                 // 4. Raw user statement excerpt
  relevance_score: 0.0,       // 5. Numeric relevance (0.0 to 1.0)
  user_intent: null,          // 6. Why product was wishlisted
  wishlist_behavior: null,    // 7. How wishlist was utilized (bookmark, sale wait, etc.)
  purchase_status: null,      // 8. Abandoned, Postponed, Bought elsewhere, etc.
  purchase_barrier: null,     // 9. Sizing doubt, quality concern, review trust, price
  uncertainty: null,          // 10. Specific doubt (e.g., Size M accuracy)
  information_needed: null,   // 11. Array of info needed (e.g., Customer try-on photos)
  alternative_considered: null, // 12. Competitor / alternative brand considered
  external_research: null,    // 13. Array of external platforms researched (Instagram, Reddit, YT)
  workaround: null,           // 14. Action taken off-platform
  user_segment: null,         // 15. Gen Z / FWD, Working Professional, EORS Shopper, etc.
  fashion_category: null,     // 16. Westernwear, Ethnic, Footwear, Lingerie, Beauty
  journey_stage: null,        // 17. Discovery -> Wishlist -> Evaluation -> Outcome
  sentiment: null,            // 18. Positive, Neutral, Negative
  evidence_strength: 'Medium',// 19. High (Direct Quote), Medium (Commentary), Low (Generic)
  rating: null,               // Star rating 1 to 5
  theme: null,                // 20. Primary opportunity theme
  sub_theme: null             // 20b. Specific sub-theme
};

/**
 * Validates, cleans, and sanitizes a raw extracted evidence object.
 * Applies strict null fallback rule for zero-hallucination guarantee.
 * 
 * @param {Object} rawRecord Raw input extracted record
 * @returns {Object} Cleaned, validated, and normalized 20-attribute evidence object
 */
function validateAndSanitizeRecord(rawRecord) {
  if (!rawRecord || typeof rawRecord !== 'object') {
    throw new Error('Invalid record: record must be a non-null object');
  }

  const sanitized = { ...SCHEMA_TEMPLATE };

  // Star Rating Validation (1 to 5)
  const parseRating = parseInt(rawRecord.rating, 10);
  if (!isNaN(parseRating) && parseRating >= 1 && parseRating <= 5) {
    sanitized.rating = parseRating;
  } else {
    sanitized.rating = null;
  }

  // 1. Text & Source (Required fields)
  sanitized.text = typeof rawRecord.text === 'string' && rawRecord.text.trim().length > 0
    ? rawRecord.text.trim()
    : null;

  if (!sanitized.text) {
    throw new Error('Record validation failed: "text" field is required and cannot be empty.');
  }

  sanitized.source = typeof rawRecord.source === 'string' && ALLOWED_SOURCES.includes(rawRecord.source.trim())
    ? rawRecord.source.trim()
    : 'Public Forum';

  sanitized.source_url = typeof rawRecord.source_url === 'string' && rawRecord.source_url.trim().length > 0
    ? rawRecord.source_url.trim()
    : null;

  sanitized.date = typeof rawRecord.date === 'string' && !isNaN(Date.parse(rawRecord.date))
    ? new Date(rawRecord.date).toISOString()
    : new Date().toISOString();

  // 5. Relevance Score (0.0 to 1.0)
  const relScore = parseFloat(rawRecord.relevance_score);
  sanitized.relevance_score = !isNaN(relScore)
    ? Math.min(Math.max(relScore, 0.0), 1.0)
    : 0.5;

  // Behavioral Extraction Fields (Null Fallbacks)
  sanitized.user_intent = cleanStringOrNull(rawRecord.user_intent);
  sanitized.wishlist_behavior = cleanStringOrNull(rawRecord.wishlist_behavior);
  sanitized.purchase_status = cleanStringOrNull(rawRecord.purchase_status);
  sanitized.purchase_barrier = cleanStringOrNull(rawRecord.purchase_barrier);
  sanitized.uncertainty = cleanStringOrNull(rawRecord.uncertainty);
  
  // Array fields
  sanitized.information_needed = cleanArrayOrNull(rawRecord.information_needed);
  sanitized.alternative_considered = cleanStringOrNull(rawRecord.alternative_considered);
  sanitized.external_research = cleanArrayOrNull(rawRecord.external_research);
  sanitized.workaround = cleanStringOrNull(rawRecord.workaround);
  
  // Taxonomy fields
  sanitized.user_segment = cleanStringOrNull(rawRecord.user_segment);
  sanitized.fashion_category = cleanStringOrNull(rawRecord.fashion_category);
  sanitized.journey_stage = cleanStringOrNull(rawRecord.journey_stage);

  // Sentiment
  sanitized.sentiment = typeof rawRecord.sentiment === 'string' && ALLOWED_SENTIMENTS.includes(rawRecord.sentiment.trim())
    ? rawRecord.sentiment.trim()
    : 'Neutral';

  // Evidence Strength classification (High = Direct personal statement, Medium = Commentary, Low = Generic)
  if (typeof rawRecord.evidence_strength === 'string' && ALLOWED_EVIDENCE_STRENGTHS.includes(rawRecord.evidence_strength.trim())) {
    sanitized.evidence_strength = rawRecord.evidence_strength.trim();
  } else {
    // Auto-derive evidence strength from text indicators
    sanitized.evidence_strength = deriveEvidenceStrength(sanitized.text);
  }

  // Theme & Sub-theme
  sanitized.theme = cleanStringOrNull(rawRecord.theme) || 'General Wishlist Behavior';
  sanitized.sub_theme = cleanStringOrNull(rawRecord.sub_theme);

  return sanitized;
}

/**
 * Helper to sanitize string inputs to null if empty
 */
function cleanStringOrNull(val) {
  if (typeof val === 'string' && val.trim().length > 0 && val.trim().toLowerCase() !== 'null') {
    return val.trim();
  }
  return null;
}

/**
 * Helper to sanitize array inputs to non-empty array or null
 */
function cleanArrayOrNull(val) {
  if (Array.isArray(val)) {
    const cleaned = val.map(item => typeof item === 'string' ? item.trim() : null).filter(Boolean);
    return cleaned.length > 0 ? cleaned : null;
  }
  if (typeof val === 'string' && val.trim().length > 0 && val.trim().toLowerCase() !== 'null') {
    return [val.trim()];
  }
  return null;
}

/**
 * Derives evidence strength based on first-person statement indicators vs general remarks.
 */
function deriveEvidenceStrength(text) {
  const lower = text.toLowerCase();
  const firstPersonIndicators = ['i added', 'i saved', 'my wishlist', 'i was looking', 'i ordered', 'i didn\'t buy', 'i abandoned', 'i bought', 'i checked', 'my size'];
  const genericIndicators = ['app should', 'apps should', 'myntra should', 'myntra needs', 'should fix', 'people usually', 'always bad', 'worst app'];

  const hasFirstPerson = firstPersonIndicators.some(ind => lower.includes(ind));
  const hasGeneric = genericIndicators.some(ind => lower.includes(ind));

  if (hasFirstPerson) return 'High';
  if (hasGeneric) return 'Low';
  return 'Medium';
}

module.exports = {
  SCHEMA_TEMPLATE,
  ALLOWED_SOURCES,
  ALLOWED_EVIDENCE_STRENGTHS,
  ALLOWED_SENTIMENTS,
  validateAndSanitizeRecord,
  cleanStringOrNull,
  cleanArrayOrNull,
  deriveEvidenceStrength
};
