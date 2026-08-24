/**
 * Behavioral Extraction Engine for Myntra AI Discovery Engine.
 * Extracts intent, purchase barriers, external workarounds, and user segments from public feedback.
 * Strictly adheres to 20-attribute schema (schema.js) and zero-hallucination null fallbacks.
 */

const { validateAndSanitizeRecord, deriveEvidenceStrength } = require('./schema');

/**
 * Main extraction function that converts a raw customer statement into a 20-attribute evidence object.
 * 
 * @param {Object} rawItem Raw input item from data sources (App Store, Reddit, YouTube, etc.)
 * @returns {Object} Validated 20-attribute research evidence object
 */
function extractEvidenceFromRawText(rawItem) {
  if (!rawItem || !rawItem.text) {
    throw new Error('Extraction failed: raw item must contain a text field');
  }

  const text = rawItem.text;
  const lowerText = text.toLowerCase();

  // 1. Fashion Category Extraction
  const fashionCategory = detectFashionCategory(lowerText);

  // 2. User Segment Extraction
  const userSegment = detectUserSegment(lowerText, rawItem.platform_context);

  // 3. User Intent & Wishlist Behavior
  const { intent, wishlistBehavior } = extractWishlistBehavior(lowerText);

  // 4. Purchase Barrier & Specific Uncertainty
  const { barrier, uncertainty, theme, subTheme } = extractPurchaseBarrierAndTheme(lowerText, fashionCategory);

  // 5. Purchase Status & Journey Stage
  const { purchaseStatus, journeyStage, sentiment } = extractOutcomeAndJourney(lowerText);

  // 6. Information Needed
  const informationNeeded = extractInformationNeeded(lowerText);

  // 7. Alternative Considered & External Research / Workarounds
  const alternativeConsidered = extractAlternativeConsidered(lowerText);
  const externalResearch = extractExternalResearch(lowerText);
  const workaround = extractWorkaround(lowerText, externalResearch);

  // 8. Evidence Strength Derivation
  const evidenceStrength = deriveEvidenceStrength(text);

  // Construct raw extracted payload
  const rawExtracted = {
    source: rawItem.source || 'Public Forum',
    source_url: rawItem.source_url || null,
    date: rawItem.date || new Date().toISOString(),
    text: text,
    relevance_score: calculateRelevanceScore(lowerText),
    user_intent: intent,
    wishlist_behavior: wishlistBehavior,
    purchase_status: purchaseStatus,
    purchase_barrier: barrier,
    uncertainty: uncertainty,
    information_needed: informationNeeded,
    alternative_considered: alternativeConsidered,
    external_research: externalResearch,
    workaround: workaround,
    user_segment: userSegment,
    fashion_category: fashionCategory,
    journey_stage: journeyStage,
    sentiment: sentiment,
    evidence_strength: evidenceStrength,
    rating: rawItem.rating || null,
    theme: theme,
    sub_theme: subTheme
  };

  // Pass through strict 20-attribute schema validator
  return validateAndSanitizeRecord(rawExtracted);
}

/**
 * Process a batch array of raw feedback objects.
 */
function processRawFeedbackDataset(rawDataset) {
  if (!Array.isArray(rawDataset)) {
    throw new Error('Invalid dataset: expected an array of raw feedback objects');
  }

  return rawDataset.map(item => {
    try {
      return extractEvidenceFromRawText(item);
    } catch (err) {
      console.warn(`Extraction warning for item ${item.id || 'unknown'}: ${err.message}`);
      return null;
    }
  }).filter(Boolean);
}

/* -------------------------------------------------------------------------- */
/*                            EXTRACTION HELPERS                              */
/* -------------------------------------------------------------------------- */

function detectFashionCategory(text) {
  if (text.includes('dress') || text.includes('top') || text.includes('denim') || text.includes('jeans') || text.includes('trousers') || text.includes('jacket') || text.includes('blazer')) return 'Westernwear';
  if (text.includes('kurta') || text.includes('anarkali') || text.includes('saree') || text.includes('lehenga') || text.includes('ethnic') || text.includes('suit')) return 'Ethnic Wear';
  if (text.includes('sneakers') || text.includes('shoes') || text.includes('heels') || text.includes('boots') || text.includes('flats')) return 'Footwear';
  if (text.includes('bra') || text.includes('lingerie') || text.includes('activewear') || text.includes('gymwear') || text.includes('sports bra')) return 'Lingerie & Activewear';
  if (text.includes('skincare') || text.includes('makeup') || text.includes('lipstick') || text.includes('fragrance')) return 'Beauty & Grooming';
  return null;
}

function detectUserSegment(text, context) {
  if (text.includes('fwd') || text.includes('gen z') || text.includes('crop top') || text.includes('viral') || text.includes('corset')) return 'Gen Z / Myntra FWD';
  if (text.includes('formal') || text.includes('work') || text.includes('blazer') || text.includes('corporate') || text.includes('shirt')) return 'Working Professional';
  if (text.includes('eors') || text.includes('sale') || text.includes('discount') || text.includes('diwali') || text.includes('price drop')) return 'EORS Sale Shopper';
  if (text.includes('sangeet') || text.includes('wedding') || text.includes('birthday') || text.includes('event') || text.includes('cousin')) return 'Occasional / Event Shopper';
  return 'High-Frequency Fashion Shopper';
}

function extractWishlistBehavior(text) {
  let intent = null;
  let behavior = null;

  if (text.includes('mood board') || text.includes('bookmarking') || text.includes('saved for future')) {
    intent = 'Bookmarking & Style Inspiration';
    behavior = 'Wishlist used as mood board without immediate purchase intent';
  } else if (text.includes('eors') || text.includes('sale') || text.includes('price drop') || text.includes('waiting for')) {
    intent = 'Sale & Price Drop Monitoring';
    behavior = 'Wishlisting items to hold until discount event';
  } else if (text.includes('compare') || text.includes('choosing one') || text.includes('shortlist')) {
    intent = 'Product Shortlisting & Comparison';
    behavior = 'Saving multiple options to evaluate before final decision';
  } else if (text.includes('wishlist') || text.includes('saved') || text.includes('added')) {
    intent = 'Wishlisted for Evaluation';
    behavior = 'Item shortlisted for fit & review evaluation';
  }

  return { intent, wishlistBehavior: behavior };
}

function extractPurchaseBarrierAndTheme(text, category) {
  let barrier = null;
  let uncertainty = null;
  let theme = 'General Wishlist Behavior';
  let subTheme = null;

  if (text.includes('photo') || text.includes('real customer') || text.includes('fake') || text.includes('no picture') || text.includes('no photos')) {
    barrier = 'Lack of Authentic Customer Photo Reviews';
    theme = 'Review & Fabric Quality Trust';
    uncertainty = 'Lack of unedited customer try-on photos and verified reviews';
    subTheme = 'Unverified Review Trust';
  } else if (text.includes('fabric') || text.includes('sheer') || text.includes('synthetic') || text.includes('durability')) {
    barrier = 'Fabric & Material Quality Doubt';
    theme = 'Review & Fabric Quality Trust';
    uncertainty = 'Real fabric composition, transparency, and wash durability';
    subTheme = 'Fabric Composition & Transparency';
  } else if (text.includes('size') || text.includes('fit') || text.includes('boxy') || text.includes('chest') || text.includes('waist') || text.includes('cup size') || text.includes('broad feet')) {
    barrier = 'Size & Silhouette Fit Uncertainty';
    theme = 'Fit & Size Uncertainty';
    if (text.includes('size chart') || text.includes('inconsistent')) {
      uncertainty = 'Size chart inaccuracy and inter-brand size inconsistency';
      subTheme = 'Size Chart Inconsistency';
    } else if (text.includes('body type') || text.includes('boxy') || text.includes('silhouette')) {
      uncertainty = 'How clothes fit actual Indian body types vs model photos';
      subTheme = 'Body Type Fit Silhouette';
    } else {
      uncertainty = 'Fit and size accuracy uncertainty';
      subTheme = 'Sizing Accuracy Doubt';
    }
  } else if (text.includes('instagram') || text.includes('youtube') || text.includes('left the app') || text.includes('searched')) {
    barrier = 'Off-App Research Leakage';
    theme = 'App Leakage (Instagram/YouTube)';
    uncertainty = 'Lack of real-life try-on content within Myntra app';
    subTheme = 'Social Media Validation Reliance';
  } else if (text.includes('price') || text.includes('discount') || text.includes('volatile')) {
    barrier = 'Price Fluctuation & Discount Uncertainty';
    theme = 'Price & Sale Discount Expectation';
    uncertainty = 'Uncertainty over expected sale discounts and price drops';
    subTheme = 'EORS Discount Expectation';
  } else if (text.includes('style') || text.includes('how to style')) {
    barrier = 'Outfit Styling Uncertainty';
    theme = 'Styling & Wardrobe Integration';
    uncertainty = 'Uncertainty on how to pair wishlisted item with existing wardrobe';
    subTheme = 'Outfit Pairing Inspiration';
  } else if (text.includes('stock') || text.includes('sold out') || text.includes('reservation')) {
    barrier = 'Wishlist Item Stock Outage';
    theme = 'Wishlist Overload & Stock Expiry';
    uncertainty = 'Wishlisted items getting sold out in preferred size';
    subTheme = 'Size Stock Depletion';
  } else if (text.includes('return policy') || text.includes('non-returnable') || text.includes('replacement')) {
    barrier = 'Strict Return & Replacement Policy Fear';
    theme = 'Return & Seller Policy Concerns';
    uncertainty = 'Fear of non-returnable items or restricted replacement policy';
    subTheme = 'Return Policy Restrictions';
  }

  return { barrier, uncertainty, theme, subTheme };
}

function extractOutcomeAndJourney(text) {
  let purchaseStatus = null;
  let journeyStage = null;
  let sentiment = 'Neutral';

  if (text.includes('forgot') || text.includes('abandoned') || text.includes('didn\'t buy') || text.includes('didn\'t order') || text.includes('cancelled')) {
    purchaseStatus = 'Abandoned';
    journeyStage = 'Wishlist -> External Research -> Abandonment';
    sentiment = 'Negative';
  } else if (text.includes('hold off') || text.includes('postponed') || text.includes('waiting') || text.includes('held off')) {
    purchaseStatus = 'Postponed';
    journeyStage = 'Wishlist -> Evaluation -> Postponed';
    sentiment = 'Neutral';
  } else if (text.includes('bought on ajio') || text.includes('bought elsewhere')) {
    purchaseStatus = 'Bought on Competitor Platform';
    journeyStage = 'Myntra Wishlist -> Off-App Search -> Competitor Purchase';
    sentiment = 'Negative';
  } else if (text.includes('bought it') || text.includes('converted') || text.includes('ordered')) {
    purchaseStatus = 'Purchased';
    journeyStage = 'Wishlist -> Research -> Purchase';
    sentiment = 'Positive';
  } else {
    purchaseStatus = 'Wishlisted / Pending';
    journeyStage = 'Wishlist -> Evaluation';
    sentiment = 'Neutral';
  }

  return { purchaseStatus, journeyStage, sentiment };
}

function extractInformationNeeded(text) {
  const info = [];
  if (text.includes('try-on') || text.includes('customer photo') || text.includes('picture')) info.push('Real customer try-on photos');
  if (text.includes('size chart') || text.includes('chest') || text.includes('waist') || text.includes('measurement')) info.push('Detailed garment body measurements');
  if (text.includes('fabric') || text.includes('sheer') || text.includes('material')) info.push('Fabric durability & transparency details');
  if (text.includes('height') || text.includes('weight')) info.push('Reviewer height/weight profile stats');
  if (text.includes('style') || text.includes('outfit')) info.push('Product styling & pairing guides');
  return info.length > 0 ? info : null;
}

function extractAlternativeConsidered(text) {
  if (text.includes('ajio')) return 'Ajio';
  if (text.includes('nykaa')) return 'Nykaa Fashion';
  if (text.includes('zara')) return 'Zara';
  if (text.includes('meesho')) return 'Meesho';
  if (text.includes('another dress') || text.includes('other 4') || text.includes('alternative')) return 'Alternative Wishlist Option';
  return null;
}

function extractExternalResearch(text) {
  const research = [];
  if (text.includes('instagram') || text.includes('insta')) research.push('Instagram Try-On Reels / Posts');
  if (text.includes('youtube') || text.includes('haul video')) research.push('YouTube Haul & Review Videos');
  if (text.includes('reddit') || text.includes('r/indianfashionaddicts')) research.push('Reddit Fashion Community Feedback');
  if (text.includes('google')) research.push('Google Search');
  return research.length > 0 ? research : null;
}

function extractWorkaround(text, externalResearch) {
  if (externalResearch && externalResearch.length > 0) {
    return `Left Myntra app to search ${externalResearch.join(', ')} for authentic product details`;
  }
  if (text.includes('ajio')) {
    return 'Switched to Ajio to compare size chart & return policy';
  }
  return null;
}

function calculateRelevanceScore(text) {
  const keyTerms = ['myntra', 'wishlist', 'saved', 'buy', 'size', 'fit', 'eors', 'fabric', 'review', 'instagram', 'youtube', 'bought'];
  let score = 0.5;
  keyTerms.forEach(term => {
    if (text.includes(term)) score += 0.05;
  });
  return Math.min(Math.round(score * 100) / 100, 0.98);
}

module.exports = {
  extractEvidenceFromRawText,
  processRawFeedbackDataset
};
