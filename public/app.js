/**
 * Client Controller & Dynamic UI Logic for Myntra AI Discovery Engine.
 * Supports guided research questions, interactive Chart.js filtering,
 * 8 shopper segments, and accurate review journey interpretations.
 */

let state = {
  activeQuery: '',
  selectedSources: ['App Store', 'Play Store', 'Reddit', 'YouTube'],
  selectedRatings: [1, 2, 3, 4, 5],
  selectedSegment: '',
  selectedTheme: null,
  currentData: null
};

// Chart instances
let oppChartInstance = null;
let ratingChartInstance = null;
let segmentChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  fetchSearchResults();
});

function initEventListeners() {
  // Guided Research Question Selector
  const questionSelect = document.getElementById('researchQuestionSelect');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');

  if (questionSelect) {
    questionSelect.addEventListener('change', (e) => {
      const q = e.target.value;
      if (q) {
        searchInput.value = q;
        state.activeQuery = q;
        state.selectedTheme = null;
        fetchSearchResults();
      }
    });
  }

  // Search button & Enter key
  searchBtn.addEventListener('click', () => {
    state.activeQuery = searchInput.value;
    state.selectedTheme = null;
    fetchSearchResults();
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      state.activeQuery = searchInput.value;
      state.selectedTheme = null;
      fetchSearchResults();
    }
  });

  // Source Checkboxes
  document.querySelectorAll('.filter-src').forEach(cb => {
    cb.addEventListener('change', () => {
      state.selectedSources = Array.from(document.querySelectorAll('.filter-src:checked')).map(c => c.value);
      fetchSearchResults();
    });
  });

  // Rating Checkboxes (1-5 Stars)
  document.querySelectorAll('.filter-rating').forEach(cb => {
    cb.addEventListener('change', () => {
      state.selectedRatings = Array.from(document.querySelectorAll('.filter-rating:checked')).map(c => parseInt(c.value, 10));
      fetchSearchResults();
    });
  });

  // 8 Shopper Segments Dropdown
  document.getElementById('segmentFilter').addEventListener('change', (e) => {
    state.selectedSegment = e.target.value;
    fetchSearchResults();
  });

  // Reset Filters Button
  document.getElementById('resetFiltersBtn').addEventListener('click', () => {
    state.activeQuery = '';
    state.selectedSources = ['App Store', 'Play Store', 'Reddit', 'YouTube'];
    state.selectedRatings = [1, 2, 3, 4, 5];
    state.selectedSegment = '';
    state.selectedTheme = null;

    searchInput.value = '';
    questionSelect.value = '';
    document.querySelectorAll('.filter-src').forEach(c => c.checked = true);
    document.querySelectorAll('.filter-rating').forEach(c => c.checked = true);
    document.getElementById('segmentFilter').value = '';

    fetchSearchResults();
  });

  // Drawer Close
  document.getElementById('closeDrawerBtn').addEventListener('click', closeDrawer);
  document.getElementById('drawerOverlay').addEventListener('click', closeDrawer);
}

/**
 * Executes API call to backend /api/search
 */
async function fetchSearchResults() {
  try {
    const srcParam = state.selectedSources.join(',');
    const ratingParam = state.selectedRatings.join(',');
    const url = `/api/search?q=${encodeURIComponent(state.activeQuery)}&mode=explore&source=${srcParam}&rating=${ratingParam}&segment=${encodeURIComponent(state.selectedSegment)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.success) {
      state.currentData = data;
      renderDashboard(data);
    }
  } catch (err) {
    console.error('Search API error:', err);
  }
}

/**
 * Renders full dashboard components
 */
function renderDashboard(data) {
  // 1. Top Finding Banner
  renderTopFinding(data);

  // 2. Counter Evidence Panel
  renderCounterEvidence(data.counter_evidence);

  // 3. Interactive Visual Graph Analytics
  renderCharts(data);

  // 4. Discovered Themes & Customer Friction Map
  renderOpportunityMap(data.opportunities || []);

  // 5. Direct Evidence Feed
  renderEvidenceFeed(data.evidence_feed || []);
}

function renderTopFinding(data) {
  const counts = data.empirical_counts || { total_conversations: 0, direct_purchase_mentions: 0, external_workarounds: 0, high_confidence_evidence: 0 };
  
  document.getElementById('findingCountTag').textContent = `Matching Customer Feedback: ${counts.total_conversations}`;
  document.getElementById('findingTitle').textContent = data.mode_data?.headline || 'Empirical Consumer Research Insights';
  document.getElementById('findingDesc').textContent = data.finding || 'Select a guided growth question above or type a search query.';

  document.getElementById('statConversations').textContent = counts.total_conversations;
  document.getElementById('statAbandonment').textContent = counts.direct_purchase_mentions;
  document.getElementById('statWorkarounds').textContent = counts.external_workarounds;
  document.getElementById('statDirectQuotes').textContent = counts.high_confidence_evidence;
}

function renderCounterEvidence(counterData) {
  const banner = document.getElementById('counterEvidenceBanner');
  const container = document.getElementById('counterList');
  container.innerHTML = '';

  if (!counterData || !counterData.has_disconfirming_evidence || counterData.examples.length === 0) {
    banner.style.display = 'none';
    return;
  }

  banner.style.display = 'block';
  counterData.examples.forEach(ex => {
    const item = document.createElement('div');
    item.className = 'counter-item';
    item.innerHTML = `<strong>${ex.type}:</strong> "${ex.text}" <br><span style="color:var(--text-muted); font-size:11px;">Insight: ${ex.insight} (${ex.source})</span>`;
    container.appendChild(item);
  });
}

/**
 * Renders interactive Chart.js graphs with click-to-filter support
 */
function renderCharts(data) {
  if (typeof Chart === 'undefined') return;

  const opps = data.opportunities || [];
  const counts = data.empirical_counts || {};
  const ratingDist = counts.rating_distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  // 1. Research Themes Volume Chart (Interactive)
  const oppLabels = opps.slice(0, 5).map(o => o.opportunity);
  const oppVolumes = opps.slice(0, 5).map(o => o.evidence_volume);

  const ctx1 = document.getElementById('opportunityChart')?.getContext('2d');
  if (ctx1) {
    if (oppChartInstance) oppChartInstance.destroy();
    oppChartInstance = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: oppLabels,
        datasets: [{
          label: 'Customer Evidence Volume',
          data: oppVolumes,
          backgroundColor: '#FF3F6C',
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const selectedThemeName = oppLabels[index];
            filterFeedByTheme(selectedThemeName);
          }
        },
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A3B8' } },
          y: { grid: { display: false }, ticks: { color: '#F8FAFC', font: { size: 11 } } }
        }
      }
    });
  }

  // 2. Customer Review Rating Breakdown Chart (Interactive 1-5 Stars)
  const ctx2 = document.getElementById('ratingChart')?.getContext('2d');
  if (ctx2) {
    if (ratingChartInstance) ratingChartInstance.destroy();
    ratingChartInstance = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: ['1★', '2★', '3★', '4★', '5★'],
        datasets: [{
          label: 'Reviews Count',
          data: [ratingDist[1] || 0, ratingDist[2] || 0, ratingDist[3] || 0, ratingDist[4] || 0, ratingDist[5] || 0],
          backgroundColor: ['#EF4444', '#F97316', '#F59E0B', '#3B82F6', '#10B981'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const selectedStar = elements[0].index + 1;
            filterFeedByRating(selectedStar);
          }
        },
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#F8FAFC' } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94A3B8' } }
        }
      }
    });
  }

  // 3. Shopper Segment Distribution Chart (Interactive)
  const topOpp = opps[0];
  const segData = topOpp ? topOpp.segment_breakdown : {};
  const segLabels = Object.keys(segData);
  const segValues = Object.values(segData);

  const ctx3 = document.getElementById('segmentChart')?.getContext('2d');
  if (ctx3) {
    if (segmentChartInstance) segmentChartInstance.destroy();
    segmentChartInstance = new Chart(ctx3, {
      type: 'doughnut',
      data: {
        labels: segLabels,
        datasets: [{
          data: segValues,
          backgroundColor: ['#FF3F6C', '#38BDF8', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899', '#6366F1', '#14B8A6'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const selectedSegmentName = segLabels[index];
            filterFeedBySegment(selectedSegmentName);
          }
        },
        plugins: {
          legend: { position: 'right', labels: { color: '#94A3B8', font: { size: 10 } } }
        }
      }
    });
  }
}

/**
 * Filter evidence feed by clicking chart elements
 */
function filterFeedByTheme(themeName) {
  state.selectedTheme = themeName;
  const feed = state.currentData?.evidence_feed || [];
  const filtered = feed.filter(r => r.theme && r.theme.toLowerCase() === themeName.toLowerCase());
  renderEvidenceFeed(filtered.length > 0 ? filtered : feed);
  document.getElementById('feedHeading').textContent = `Evidence Feed — Filtered by Theme: "${themeName}"`;
}

function filterFeedByRating(starRating) {
  state.selectedRatings = [starRating];
  document.querySelectorAll('.filter-rating').forEach(c => {
    c.checked = parseInt(c.value, 10) === starRating;
  });
  fetchSearchResults();
  document.getElementById('feedHeading').textContent = `Evidence Feed — Filtered by Rating: ${starRating} Star (${starRating}★)`;
}

function filterFeedBySegment(segmentName) {
  state.selectedSegment = segmentName;
  document.getElementById('segmentFilter').value = segmentName;
  fetchSearchResults();
  document.getElementById('feedHeading').textContent = `Evidence Feed — Filtered by Segment: "${segmentName}"`;
}

function renderOpportunityMap(opportunities) {
  const grid = document.getElementById('opportunityGrid');
  grid.innerHTML = '';

  if (opportunities.length === 0) {
    grid.innerHTML = '<div style="color:var(--text-muted); font-size:13px;">No research themes matched the selected filter criteria.</div>';
    return;
  }

  opportunities.forEach(opp => {
    const card = document.createElement('div');
    card.className = 'opportunity-card';
    card.innerHTML = `
      <div class="opp-card-header">
        <h4 class="opp-title">${opp.opportunity}</h4>
        <span class="theme-badge-vol">${opp.evidence_volume} Conversations</span>
      </div>
      <span class="opp-segment">Primary Segment Concentration: ${opp.segment_concentration}</span>
      <p style="font-size:12px; color:var(--text-secondary); margin-bottom:12px;">${opp.description}</p>
      <div class="metrics-bar-grid">
        <div class="metric-bar-item"><span>Frequency:</span> <strong>${opp.metric_levels.frequency} (${opp.metrics.frequency}/10)</strong></div>
        <div class="metric-bar-item"><span>Severity:</span> <strong>${opp.metric_levels.severity} (${opp.metrics.severity}/10)</strong></div>
        <div class="metric-bar-item"><span>Purchase Proximity:</span> <strong>${opp.metric_levels.purchase_proximity} (${opp.metrics.purchase_proximity}/10)</strong></div>
        <div class="metric-bar-item"><span>Workaround Intensity:</span> <strong>${opp.metric_levels.workaround_intensity} (${opp.metrics.workaround_intensity}/10)</strong></div>
      </div>
    `;
    card.addEventListener('click', () => openOpportunityDrawer(opp));
    grid.appendChild(card);
  });
}

function renderEvidenceFeed(feed) {
  const grid = document.getElementById('evidenceFeedGrid');
  grid.innerHTML = '';

  if (feed.length === 0) {
    grid.innerHTML = '<div style="color:var(--text-muted); font-size:13px;">No customer evidence cards available for current search filters.</div>';
    return;
  }

  feed.forEach(item => {
    const card = document.createElement('div');
    card.className = 'evidence-card';
    const strClass = item.evidence_strength === 'High' ? 'strength-high' : 'strength-medium';

    // Render Star Rating HTML
    const starsHtml = renderStarRating(item.rating);

    card.innerHTML = `
      <div>
        <div class="evidence-card-header">
          <span class="source-badge">${item.source}</span>
          ${starsHtml ? `<span class="star-rating">${starsHtml}</span>` : ''}
          <span class="strength-badge ${strClass}">${item.evidence_strength} Evidence</span>
        </div>
        <p class="quote-text">"${item.text}"</p>
        <div class="tag-list">
          <span class="tag">Segment: ${item.user_segment || 'General Shoppers'}</span>
          <span class="tag">Barrier: ${item.purchase_barrier || 'None Mentioned'}</span>
          ${item.workaround ? `<span class="tag" style="color:var(--accent-amber);">Workaround: ${item.workaround}</span>` : ''}
        </div>
      </div>
      <div class="card-footer">
        ${renderJourneyBadge(item.journey_stage)}
        ${item.source_url ? `<a href="${item.source_url}" target="_blank" class="source-link">View Source ↗</a>` : ''}
      </div>
    `;
    card.addEventListener('click', () => openEvidenceDrawer(item));
    grid.appendChild(card);
  });
}

function renderJourneyBadge(stage) {
  if (!stage) return '<span class="journey-badge journey-eval">💬 Post-Purchase Product Review</span>';
  const st = String(stage);
  if (st.includes('Converted') || st.includes('Successful') || st.includes('Purchase')) {
    return `<span class="journey-badge journey-buy">🛍️ ${st}</span>`;
  }
  if (st.includes('Drop') || st.includes('Abandoned') || st.includes('Switch') || st.includes('Return') || st.includes('Complaint')) {
    return `<span class="journey-badge journey-drop">❌ ${st}</span>`;
  }
  if (st.includes('Sale') || st.includes('Price')) {
    return `<span class="journey-badge journey-sale">⚡ ${st}</span>`;
  }
  if (st.includes('Social') || st.includes('Off-App')) {
    return `<span class="journey-badge journey-social">🏃 ${st}</span>`;
  }
  if (st.includes('Fit') || st.includes('Fabric')) {
    return `<span class="journey-badge journey-fit">🔍 ${st}</span>`;
  }
  if (st.includes('Wishlist')) {
    return `<span class="journey-badge journey-eval">📌 ${st}</span>`;
  }
  return `<span class="journey-badge journey-eval">💬 ${st}</span>`;
}

function renderStarRating(rating) {
  const r = parseInt(rating, 10);
  if (isNaN(r) || r < 1 || r > 5) return null;
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}

function openOpportunityDrawer(opp) {
  const drawer = document.getElementById('detailDrawer');
  const overlay = document.getElementById('drawerOverlay');
  const body = document.getElementById('drawerBody');

  document.getElementById('drawerTitle').textContent = opp.opportunity;

  let quotesHtml = (opp.representative_quotes || []).map(q => `
    <div style="background:rgba(255,255,255,0.03); padding:12px; border-radius:8px; margin-bottom:8px; font-size:12px;">
      <p style="font-style:italic;">"${q.text}"</p>
      <div style="margin-top:6px; color:var(--text-muted); font-size:10px; display:flex; justify-content:space-between;">
        <span>Source: ${q.source}</span>
        ${q.source_url ? `<a href="${q.source_url}" target="_blank" style="color:var(--accent-blue);">Source Link ↗</a>` : ''}
      </div>
    </div>
  `).join('');

  body.innerHTML = `
    <div style="margin-bottom:16px;">
      <span class="theme-badge-vol" style="font-size:14px;">Total Conversations: ${opp.evidence_volume}</span>
      <p style="font-size:13px; color:var(--text-secondary); margin-top:8px;">${opp.description}</p>
    </div>

    <h4 style="font-size:14px; margin-bottom:8px;">Metrics & Behavior Intensity</h4>
    <div style="font-size:12px; line-height:1.8; margin-bottom:20px; background:rgba(255,255,255,0.02); padding:12px; border-radius:8px;">
      <div>Frequency: <strong>${opp.metrics.frequency}/10</strong> (${opp.metric_levels.frequency})</div>
      <div>Severity: <strong>${opp.metrics.severity}/10</strong> (${opp.metric_levels.severity})</div>
      <div>Purchase Proximity: <strong>${opp.metrics.purchase_proximity}/10</strong> (${opp.metric_levels.purchase_proximity})</div>
      <div>Workaround Intensity: <strong>${opp.metrics.workaround_intensity}/10</strong> (${opp.metric_levels.workaround_intensity})</div>
      <div>Evidence Strength: <strong>${opp.metrics.evidence_strength}/10</strong> (${opp.metric_levels.evidence_strength})</div>
    </div>

    <h4 style="font-size:14px; margin-bottom:8px;">Representative Customer Stories</h4>
    ${quotesHtml}
  `;

  drawer.classList.add('active');
  overlay.classList.add('active');
}

function openEvidenceDrawer(item) {
  const drawer = document.getElementById('detailDrawer');
  const overlay = document.getElementById('drawerOverlay');
  const body = document.getElementById('drawerBody');

  document.getElementById('drawerTitle').textContent = `Evidence #${item.id || 'Quote'}`;
  const stars = renderStarRating(item.rating);

  body.innerHTML = `
    <div style="font-size:14px; font-style:italic; margin-bottom:16px; color:#FFF; line-height:1.5;">
      "${item.text}"
    </div>
    
    <div style="font-size:12px; background:rgba(255,255,255,0.03); padding:12px; border-radius:8px; line-height:1.8;">
      <div><strong>Source:</strong> ${item.source}</div>
      ${stars ? `<div><strong>Rating:</strong> <span class="star-rating">${stars}</span> (${item.rating} Stars)</div>` : ''}
      <div><strong>Evidence Strength:</strong> ${item.evidence_strength}</div>
      <div><strong>Shopper Segment:</strong> ${item.user_segment || 'General Shoppers'}</div>
      <div><strong>Purchase Barrier:</strong> ${item.purchase_barrier || 'None'}</div>
      <div><strong>External Workaround:</strong> ${item.workaround || 'None'}</div>
      <div><strong>Journey Stage:</strong> ${item.journey_stage || 'Post-Purchase Product Feedback'}</div>
      ${item.source_url ? `<div style="margin-top:8px;"><a href="${item.source_url}" target="_blank" style="color:var(--accent-blue);">View Original Source Post ↗</a></div>` : ''}
    </div>
  `;

  drawer.classList.add('active');
  overlay.classList.add('active');
}

function closeDrawer() {
  document.getElementById('detailDrawer').classList.remove('active');
  document.getElementById('drawerOverlay').classList.remove('active');
}
