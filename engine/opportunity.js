/**
 * Opportunity Evidence Scoring Engine for Myntra AI Discovery Engine.
 * Calculates multi-dimensional Opportunity Evidence Scores:
 * Score = Frequency * Severity * Purchase Proximity * Workaround Intensity * Evidence Strength
 */

const defaultConfig = require('../config/myntra_scoring_config.json');
const { clusterEvidenceByTheme } = require('./clustering');

/**
 * Calculates Opportunity Evidence Scores for all clustered themes in an evidence database.
 * 
 * @param {Array} evidenceList Array of 20-attribute evidence records
 * @param {Object} customWeights Optional weight overrides from UI sliders
 * @returns {Array} List of ranked opportunity objects with breakdown metrics and score tables
 */
function calculateOpportunityScores(evidenceList, customWeights = null) {
  if (!Array.isArray(evidenceList) || evidenceList.length === 0) {
    return [];
  }

  const weights = customWeights || defaultConfig.weights;
  const overrides = defaultConfig.overrides || { severity_threshold: 9.0, min_opportunity_score_override: 65.0 };

  const clusters = clusterEvidenceByTheme(evidenceList);
  const totalDatasetSize = evidenceList.length;

  const opportunities = clusters.map(cluster => {
    const count = cluster.records.length;

    // 1. Frequency (F, 1-10 scale): Ratio of dataset volume
    const frequency = Math.min(10, Math.max(1, Math.round((count / totalDatasetSize) * 35)));

    // 2. Severity (S, 1-10 scale): Ratio of abandonment vs postponement
    const abandonRatio = count > 0 ? cluster.abandoned_count / count : 0;
    const severity = Math.min(10, Math.max(1, Math.round(abandonRatio * 10)));

    // 3. Purchase Proximity (P, 1-10 scale): Proximity to conversion event
    const proximity = calculateProximityScore(cluster.journey_stage_counts);

    // 4. Workaround Intensity (W, 1-10 scale): Ratio of users searching off-app (Insta, YT, Reddit)
    const workaroundRatio = count > 0 ? cluster.workaround_count / count : 0;
    const workaroundIntensity = Math.min(10, Math.max(1, Math.round(workaroundRatio * 10)));

    // 5. Evidence Strength (E, 1-10 scale): Quality of direct personal statements
    const directRatio = count > 0 ? cluster.direct_evidence_count / count : 0;
    const evidenceStrength = Math.min(10, Math.max(1, Math.round(directRatio * 10)));

    // Multi-dimensional Weighted Score Formula
    const rawWeightedScore = (
      (weights.frequency_weight * frequency) +
      (weights.severity_weight * severity) +
      (weights.proximity_weight * proximity) +
      (weights.workaround_weight * workaroundIntensity) +
      (weights.evidence_strength_weight * evidenceStrength)
    ) * 10;

    let opportunityScore = Math.min(100, Math.max(0, Math.round(rawWeightedScore * 10) / 10));

    // Severity Multiplier Override (If S >= 9.0, guarantee min score floor)
    if (severity >= overrides.severity_threshold && opportunityScore < overrides.min_opportunity_score_override) {
      opportunityScore = overrides.min_opportunity_score_override;
    }

    // Identify dominant segment concentration
    const dominantSegment = getDominantKey(cluster.segment_counts) || 'Gen Z / Myntra FWD';

    return {
      id: cluster.id,
      opportunity: cluster.theme,
      description: cluster.description,
      opportunity_score: opportunityScore,
      evidence_volume: count,
      metrics: {
        frequency: frequency,
        severity: severity,
        purchase_proximity: proximity,
        workaround_intensity: workaroundIntensity,
        evidence_strength: evidenceStrength
      },
      metric_levels: {
        frequency: getLevelString(frequency),
        severity: getLevelString(severity),
        purchase_proximity: getLevelString(proximity),
        workaround_intensity: getLevelString(workaroundIntensity),
        evidence_strength: getLevelString(evidenceStrength)
      },
      segment_concentration: dominantSegment,
      segment_breakdown: cluster.segment_counts,
      sub_theme_breakdown: cluster.sub_theme_counts,
      representative_quotes: cluster.representative_quotes,
      stats: {
        abandoned_count: cluster.abandoned_count,
        postponed_count: cluster.postponed_count,
        purchased_count: cluster.purchased_count,
        workaround_count: cluster.workaround_count,
        direct_evidence_count: cluster.direct_evidence_count
      }
    };
  });

  // Sort by Opportunity Score primary, Workaround Intensity secondary, Proximity tertiary
  return opportunities.sort((a, b) => {
    if (b.opportunity_score !== a.opportunity_score) {
      return b.opportunity_score - a.opportunity_score;
    }
    if (b.metrics.workaround_intensity !== a.metrics.workaround_intensity) {
      return b.metrics.workaround_intensity - a.metrics.workaround_intensity;
    }
    return b.metrics.purchase_proximity - a.metrics.purchase_proximity;
  });
}

/**
 * Calculates purchase proximity based on journey stage occurrences.
 */
function calculateProximityScore(journeyStageCounts) {
  let totalPoints = 0;
  let totalCount = 0;

  Object.entries(journeyStageCounts).forEach(([stage, cnt]) => {
    let weight = 5;
    if (stage.includes('Abandonment') || stage.includes('Cart')) weight = 9;
    else if (stage.includes('External Research') || stage.includes('Evaluation')) weight = 8;
    else if (stage.includes('Wishlist')) weight = 7;
    else if (stage.includes('Discovery')) weight = 4;

    totalPoints += weight * cnt;
    totalCount += cnt;
  });

  return totalCount > 0 ? Math.min(10, Math.max(1, Math.round(totalPoints / totalCount))) : 7;
}

function getDominantKey(countsObj) {
  let maxKey = null;
  let maxVal = -1;
  Object.entries(countsObj || {}).forEach(([k, v]) => {
    if (v > maxVal) {
      maxVal = v;
      maxKey = k;
    }
  });
  return maxKey;
}

function getLevelString(val) {
  if (val >= 8) return 'High';
  if (val >= 5) return 'Medium';
  return 'Low';
}

module.exports = {
  calculateOpportunityScores,
  calculateProximityScore,
  getLevelString
};
