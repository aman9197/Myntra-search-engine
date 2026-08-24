/**
 * Theme & Sub-theme Clustering Engine for Myntra AI Discovery Engine.
 * Automatically groups 20-attribute research evidence objects into high-level opportunity themes.
 */

const OPPORTUNITY_THEMES = [
  {
    id: 'TH-FIT-SIZE',
    name: 'Fit & Size Uncertainty',
    description: 'Doubts regarding sizing accuracy, body type silhouette fit, and inter-brand size chart inconsistency.',
    sub_themes: ['Size Chart Inconsistency', 'Body Type Fit Silhouette', 'Sizing Accuracy Doubt']
  },
  {
    id: 'TH-REVIEW-TRUST',
    name: 'Review & Fabric Quality Trust',
    description: 'Lack of authentic unedited customer try-on photos, fabric composition doubts, and unverified 5-star reviews.',
    sub_themes: ['Unverified Review Trust', 'Fabric Composition & Transparency', 'Lack of Real Try-on Photos']
  },
  {
    id: 'TH-APP-LEAKAGE',
    name: 'App Leakage (Instagram/YouTube)',
    description: 'Shoppers leaving Myntra to research real try-on videos, fabric durability, or social proof on Instagram, YouTube, or Reddit.',
    sub_themes: ['Social Media Validation Reliance', 'External Review Searching', 'Off-App Fabric Verification']
  },
  {
    id: 'TH-PRICE-DISCOUNT',
    name: 'Price & Sale Discount Expectation',
    description: 'Postponing purchase while waiting for EORS sales, price fluctuation distrust, or minor discount disappointment.',
    sub_themes: ['EORS Discount Expectation', 'Price Volatility Distrust', 'Sale Postponement']
  },
  {
    id: 'TH-WISHLIST-OVERLOAD',
    name: 'Wishlist Overload & Stock Expiry',
    description: 'Using wishlist purely as a mood board / bookmarking mechanism without purchase intent, leading to stock depletion.',
    sub_themes: ['Bookmarking Mechanism', 'Size Stock Depletion', 'Wishlist Expiry']
  },
  {
    id: 'TH-RETURN-POLICY',
    name: 'Return & Seller Policy Concerns',
    description: 'Fear of non-returnable categories (lingerie/activewear) or strict 7-day seller replacement rules.',
    sub_themes: ['Return Policy Restrictions', 'Non-Returnable Category Doubt', 'Replacement vs Refund']
  },
  {
    id: 'TH-STYLING',
    name: 'Styling & Wardrobe Integration',
    description: 'Uncertainty on how to pair wishlisted items (e.g. Gen Z FWD tops) with existing wardrobe pieces.',
    sub_themes: ['Outfit Pairing Inspiration', 'Wardrobe Integration', 'Occasional Outfit Planning']
  }
];

/**
 * Clusters a list of extracted evidence records into grouped themes with summary metrics.
 * 
 * @param {Array} evidenceList Array of 20-attribute evidence records
 * @returns {Array} List of clustered theme objects with metrics and representative quotes
 */
function clusterEvidenceByTheme(evidenceList) {
  if (!Array.isArray(evidenceList)) return [];

  const themeMap = new Map();

  // Initialize theme map
  OPPORTUNITY_THEMES.forEach(theme => {
    themeMap.set(theme.name, {
      id: theme.id,
      theme: theme.name,
      description: theme.description,
      records: [],
      sub_theme_counts: {},
      segment_counts: {},
      journey_stage_counts: {},
      sources_counts: {},
      abandoned_count: 0,
      postponed_count: 0,
      purchased_count: 0,
      workaround_count: 0,
      direct_evidence_count: 0
    });
  });

  // Default catch-all cluster
  const defaultThemeName = 'General Wishlist Behavior';
  themeMap.set(defaultThemeName, {
    id: 'TH-GENERAL',
    theme: defaultThemeName,
    description: 'General wishlist usage, bookmarking, and unclassified shopping behaviors.',
    records: [],
    sub_theme_counts: {},
    segment_counts: {},
    journey_stage_counts: {},
    sources_counts: {},
    abandoned_count: 0,
    postponed_count: 0,
    purchased_count: 0,
    workaround_count: 0,
    direct_evidence_count: 0
  });

  // Assign evidence objects to themes
  evidenceList.forEach(record => {
    const themeName = record.theme && themeMap.has(record.theme) ? record.theme : defaultThemeName;
    const cluster = themeMap.get(themeName);

    cluster.records.push(record);

    // Sub-theme counter
    const sub = record.sub_theme || 'General';
    cluster.sub_theme_counts[sub] = (cluster.sub_theme_counts[sub] || 0) + 1;

    // Segment counter
    const segment = record.user_segment || 'General Shoppers';
    cluster.segment_counts[segment] = (cluster.segment_counts[segment] || 0) + 1;

    // Journey stage counter
    const stage = record.journey_stage || 'Wishlist -> Evaluation';
    cluster.journey_stage_counts[stage] = (cluster.journey_stage_counts[stage] || 0) + 1;

    // Source counter
    const src = record.source || 'Public Forum';
    cluster.sources_counts[src] = (cluster.sources_counts[src] || 0) + 1;

    // Status counters
    if (record.purchase_status === 'Abandoned' || record.purchase_status === 'Bought on Competitor Platform') {
      cluster.abandoned_count++;
    } else if (record.purchase_status === 'Postponed') {
      cluster.postponed_count++;
    } else if (record.purchase_status === 'Purchased') {
      cluster.purchased_count++;
    }

    // Workaround counter
    if (record.workaround || (record.external_research && record.external_research.length > 0)) {
      cluster.workaround_count++;
    }

    // Direct quote evidence strength counter
    if (record.evidence_strength === 'High') {
      cluster.direct_evidence_count++;
    }
  });

  // Convert map to formatted array and compute representative quotes
  const clusters = [];
  themeMap.forEach(cluster => {
    if (cluster.records.length > 0) {
      cluster.total_records = cluster.records.length;
      cluster.representative_quotes = getRepresentativeQuotes(cluster.records, 3);
      clusters.push(cluster);
    }
  });

  return clusters;
}

/**
 * Extracts top representative quotes for a theme prioritized by evidence strength and relevance.
 */
function getRepresentativeQuotes(records, limit = 3) {
  const sorted = [...records].sort((a, b) => {
    // High evidence strength first
    const scoreA = (a.evidence_strength === 'High' ? 2 : 1) + (a.relevance_score || 0.5);
    const scoreB = (b.evidence_strength === 'High' ? 2 : 1) + (b.relevance_score || 0.5);
    return scoreB - scoreA;
  });

  return sorted.slice(0, limit).map(r => ({
    id: r.id || 'EV-QUOTE',
    text: r.text,
    source: r.source,
    source_url: r.source_url,
    user_segment: r.user_segment,
    purchase_barrier: r.purchase_barrier,
    workaround: r.workaround,
    evidence_strength: r.evidence_strength
  }));
}

module.exports = {
  OPPORTUNITY_THEMES,
  clusterEvidenceByTheme,
  getRepresentativeQuotes
};
