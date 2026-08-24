/**
 * 4-Mode RAG Search Engine & Counter-Evidence Core for Myntra AI Discovery Engine.
 * Supports Explore, Compare, Segment, and Evidence search modes.
 * Implements Negative & Counter-Evidence detection to prevent confirmation bias.
 */

const { calculateOpportunityScores } = require('./opportunity');

/**
 * Main RAG Search Entry Point.
 * Executes search query based on selected mode, filters, and counter-evidence logic.
 * 
 * @param {string} query Natural language search query
 * @param {string} mode Search mode: 'explore' | 'compare' | 'segment' | 'evidence'
 * @param {Object} filters Multi-facet filters: { sources: [], segments: [], categories: [], journey_stages: [] }
 * @param {Array} evidenceDb Array of 20-attribute research evidence objects
 * @returns {Object} Structured RAG Search Response
 */
function executeRAGSearch(query, mode = 'explore', filters = {}, evidenceDb = []) {
  const normalizedQuery = (query || '').toLowerCase().trim();
  const activeMode = (mode || 'explore').toLowerCase().trim();

  // 1. Apply Multi-Facet Filtering
  const filteredRecords = filterEvidence(evidenceDb, filters, normalizedQuery);

  // 2. Compute Opportunity Scores for Filtered Corpus
  const opportunities = calculateOpportunityScores(filteredRecords);

  // 3. Extract Counter-Evidence (Disconfirming evidence)
  const counterEvidence = extractCounterEvidence(filteredRecords, normalizedQuery);

  // 4. Route Query to Mode-Specific Handler
  let modeResult = {};
  switch (activeMode) {
    case 'compare':
      modeResult = executeCompareMode(normalizedQuery, filteredRecords, opportunities);
      break;
    case 'segment':
      modeResult = executeSegmentMode(normalizedQuery, filteredRecords, opportunities);
      break;
    case 'evidence':
      modeResult = executeEvidenceMode(normalizedQuery, filteredRecords);
      break;
    case 'explore':
    default:
      modeResult = executeExploreMode(normalizedQuery, filteredRecords, opportunities);
      break;
  }

  // 5. Synthesize Evidence-Backed Research Summary
  const empiricalCounts = calculateEmpiricalCounts(filteredRecords);
  const summaryFinding = synthesizeFinding(normalizedQuery, activeMode, modeResult, empiricalCounts, counterEvidence);

  return {
    query: query,
    mode: activeMode,
    timestamp: new Date().toISOString(),
    total_matching_conversations: filteredRecords.length,
    empirical_counts: empiricalCounts,
    finding: summaryFinding,
    mode_data: modeResult,
    opportunities: opportunities.slice(0, 6),
    counter_evidence: counterEvidence,
    evidence_feed: getTopEvidenceFeed(filteredRecords, 10)
  };
}

/* -------------------------------------------------------------------------- */
/*                            SEARCH MODE HANDLERS                            */
/* -------------------------------------------------------------------------- */

/**
 * Mode 1 — Explore: Broad thematic discovery
 */
function executeExploreMode(query, records, opportunities) {
  const topOpp = opportunities.length > 0 ? opportunities[0] : null;

  return {
    mode_name: 'Explore',
    headline: topOpp ? `Top Friction: ${topOpp.opportunity}` : 'Broad Wishlist Discovery',
    overview: topOpp
      ? `${topOpp.opportunity} appears repeatedly in ${topOpp.evidence_volume} conversations where users express purchase intent but abandon or postpone orders.`
      : 'Analyzing general wishlist to purchase conversion behavior.',
    top_opportunity: topOpp,
    theme_distribution: opportunities.map(o => ({
      theme: o.opportunity,
      score: o.opportunity_score,
      volume: o.evidence_volume,
      level: o.metric_levels.severity
    }))
  };
}

/**
 * Mode 2 — Compare: Comparative analysis of opportunity areas
 */
function executeCompareMode(query, records, opportunities) {
  let themeA = opportunities[0] || null;
  let themeB = opportunities[1] || null;

  // Check if query mentions specific themes to compare (e.g., "compare fit vs price")
  if (query.includes('price') || query.includes('discount')) {
    const priceOpp = opportunities.find(o => o.opportunity.toLowerCase().includes('price'));
    const fitOpp = opportunities.find(o => o.opportunity.toLowerCase().includes('fit'));
    if (priceOpp) themeB = priceOpp;
    if (fitOpp) themeA = fitOpp;
  }

  return {
    mode_name: 'Compare',
    comparison_target: {
      theme_a: themeA ? themeA.opportunity : 'Theme A',
      theme_b: themeB ? themeB.opportunity : 'Theme B'
    },
    metrics_comparison: {
      theme_a: themeA ? { name: themeA.opportunity, score: themeA.opportunity_score, metrics: themeA.metrics } : null,
      theme_b: themeB ? { name: themeB.opportunity, score: themeB.opportunity_score, metrics: themeB.metrics } : null
    },
    delta_analysis: themeA && themeB ? {
      score_delta: Math.abs(themeA.opportunity_score - themeB.opportunity_score),
      higher_friction: themeA.opportunity_score >= themeB.opportunity_score ? themeA.opportunity : themeB.opportunity,
      workaround_contrast: `${themeA.opportunity} has ${themeA.metrics.workaround_intensity}/10 workaround intensity vs ${themeB.metrics.workaround_intensity}/10 for ${themeB.opportunity}.`
    } : null
  };
}

/**
 * Mode 3 — Segment: Demographic & behavioral segment analysis
 */
function executeSegmentMode(query, records, opportunities) {
  const segments = ['Gen Z / Myntra FWD', 'Working Professional', 'EORS Sale Shopper', 'Occasional / Event Shopper'];
  
  const segmentBreakdowns = segments.map(segName => {
    const segRecords = records.filter(r => r.user_segment === segName);
    const segOpps = calculateOpportunityScores(segRecords);
    return {
      segment: segName,
      total_conversations: segRecords.length,
      top_barrier: segOpps.length > 0 ? segOpps[0].opportunity : 'General Wishlist Behavior',
      top_score: segOpps.length > 0 ? segOpps[0].opportunity_score : 0,
      workaround_ratio: segRecords.length > 0 ? Math.round((segRecords.filter(r => r.workaround).length / segRecords.length) * 100) : 0
    };
  });

  return {
    mode_name: 'Segment',
    headline: 'Segment-Specific Wishlist Friction Breakdown',
    segment_comparison: segmentBreakdowns
  };
}

/**
 * Mode 4 — Evidence: Direct user evidence feed
 */
function executeEvidenceMode(query, records) {
  const directEvidence = records
    .filter(r => r.evidence_strength === 'High')
    .sort((a, b) => (b.relevance_score || 0.5) - (a.relevance_score || 0.5));

  return {
    mode_name: 'Evidence',
    total_direct_quotes: directEvidence.length,
    direct_evidence_quotes: directEvidence.slice(0, 15).map(r => ({
      id: r.id || 'EV-QUOTE',
      text: r.text,
      source: r.source,
      source_url: r.source_url,
      user_segment: r.user_segment,
      journey_stage: r.journey_stage,
      purchase_barrier: r.purchase_barrier,
      workaround: r.workaround,
      evidence_strength: r.evidence_strength
    }))
  };
}

/* -------------------------------------------------------------------------- */
/*                      NEGATIVE & COUNTER-EVIDENCE ENGINE                    */
/* -------------------------------------------------------------------------- */

/**
 * Extracts disconfirming / counter-evidence to eliminate confirmation bias (Section 15).
 */
function extractCounterEvidence(records, query) {
  const counterRecords = [];

  records.forEach(r => {
    // 1. Cases where users bought despite high price / no discount
    if (r.text.toLowerCase().includes('bought') && (r.text.toLowerCase().includes('no discount') || r.text.toLowerCase().includes('full price') || r.text.toLowerCase().includes('needed it'))) {
      counterRecords.push({
        type: 'Price Resistance Counter-Evidence',
        text: r.text,
        source: r.source,
        insight: 'User converted at full price due to urgent need, showing price was not the deciding barrier.'
      });
    }

    // 2. Cases where discount was given but user still abandoned (fit or quality issue outweighed price)
    if (r.purchase_status === 'Abandoned' && (r.text.toLowerCase().includes('discount') || r.text.toLowerCase().includes('eors')) && r.purchase_barrier && r.purchase_barrier.includes('Fit')) {
      counterRecords.push({
        type: 'Discount Inefficacy Counter-Evidence',
        text: r.text,
        source: r.source,
        insight: 'User abandoned wishlisted item despite discount/sale because fit uncertainty remained unresolved.'
      });
    }
  });

  return {
    total_counter_evidence: counterRecords.length,
    has_disconfirming_evidence: counterRecords.length > 0,
    examples: counterRecords.slice(0, 3)
  };
}

/* -------------------------------------------------------------------------- */
/*                            FILTERING & SYNTHESIS                           */
/* -------------------------------------------------------------------------- */

function filterEvidence(records, filters, query) {
  return records.filter(r => {
    // Source filter
    if (filters.sources && filters.sources.length > 0 && !filters.sources.includes(r.source)) {
      return false;
    }
    // Segment filter
    if (filters.segments && filters.segments.length > 0 && !filters.segments.includes(r.user_segment)) {
      return false;
    }
    // Category filter
    if (filters.categories && filters.categories.length > 0 && !filters.categories.includes(r.fashion_category)) {
      return false;
    }
    // Rating filter (1 to 5 stars)
    if (filters.ratings && filters.ratings.length > 0) {
      const rVal = parseInt(r.rating, 10);
      if (!isNaN(rVal) && !filters.ratings.includes(rVal)) {
        return false;
      }
    }
    // Search query keyword filter
    if (query && query.length > 2) {
      const qTerms = query.split(/\s+/).filter(t => t.length > 2);
      const textLower = (r.text || '').toLowerCase();
      const themeLower = (r.theme || '').toLowerCase();
      const barrierLower = (r.purchase_barrier || '').toLowerCase();
      const full = `${textLower} ${themeLower} ${barrierLower}`;
      const matchesAny = qTerms.some(term => full.includes(term));
      if (!matchesAny) return false;
    }
    return true;
  });
}

function calculateEmpiricalCounts(records) {
  const total = records.length;
  const abandoned = records.filter(r => r.purchase_status === 'Abandoned' || r.purchase_status === 'Bought on Competitor Platform').length;
  const workarounds = records.filter(r => r.workaround || (r.external_research && r.external_research.length > 0)).length;
  const directMentions = records.filter(r => r.evidence_strength === 'High').length;

  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, unrated: 0 };
  records.forEach(r => {
    const rate = parseInt(r.rating, 10);
    if (!isNaN(rate) && rate >= 1 && rate <= 5) {
      ratingDistribution[rate]++;
    } else {
      ratingDistribution.unrated++;
    }
  });

  return {
    total_conversations: total,
    direct_purchase_mentions: abandoned,
    external_workarounds: workarounds,
    high_confidence_evidence: directMentions,
    rating_distribution: ratingDistribution
  };
}

function synthesizeFinding(query, mode, modeData, counts, counterEv) {
  let statement = '';
  if (counts.total_conversations === 0) {
    return 'No direct evidence matching your query filter criteria was found. Try broadening search terms or removing segment filters.';
  }

  if (mode === 'compare' && modeData.comparison_target) {
    statement = `Comparative analysis shows that ${modeData.comparison_target.theme_a} vs ${modeData.comparison_target.theme_b} exhibit distinct friction profiles across ${counts.total_conversations} customer conversations.`;
  } else if (mode === 'segment') {
    statement = `Segment breakdown reveals distinct wishlist abandonment behaviors across Gen Z FWD, Working Professionals, and EORS Shopper demographics.`;
  } else {
    statement = `Discovered recurring wishlist conversion friction supported by ${counts.total_conversations} customer conversations (${counts.direct_purchase_mentions} direct abandonment mentions, ${counts.external_workarounds} off-app workarounds).`;
  }

  if (counterEv.has_disconfirming_evidence) {
    statement += ` Note: ${counterEv.total_counter_evidence} counter-evidence examples indicate discounts alone do not solve fit or review trust barriers.`;
  }

  return statement;
}

function getTopEvidenceFeed(records, limit = 10) {
  return records
    .sort((a, b) => (b.relevance_score || 0.5) - (a.relevance_score || 0.5))
    .slice(0, limit)
    .map(r => ({
      id: r.id || 'EV-FEED',
      text: r.text,
      source: r.source,
      source_url: r.source_url,
      user_segment: r.user_segment,
      journey_stage: r.journey_stage,
      purchase_barrier: r.purchase_barrier,
      workaround: r.workaround,
      evidence_strength: r.evidence_strength
    }));
}

module.exports = {
  executeRAGSearch,
  executeExploreMode,
  executeCompareMode,
  executeSegmentMode,
  executeEvidenceMode,
  extractCounterEvidence,
  filterEvidence,
  calculateEmpiricalCounts
};
