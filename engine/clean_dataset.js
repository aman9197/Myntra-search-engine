/**
 * Dataset Cleaning & Deduplication Core for Myntra AI Discovery Engine.
 * Removes duplicate text, encoding artifacts, generic 1-liner praises/complaints,
 * and superficial non-actionable reviews.
 */

const fs = require('fs');
const path = require('path');
const { processRawFeedbackDataset } = require('./extraction');

const GENERIC_PHRASES = [
  'good app', 'nice app', 'best app', 'worst app', 'bad app', 'awesome app',
  'great app', 'love this app', 'good product', 'nice product', 'best product',
  'superb app', 'osm app', 'very good', 'very nice', 'give it a shot',
  'good quality', 'fast delivery', 'good service', 'nice experience',
  'best app for shopping', 'i love it', 'loved it', 'just wow', 'superb'
];

/**
 * Normalizes text for exact and fuzzy deduplication.
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' ')    // collapse whitespace
    .trim();
}

/**
 * Checks if a review is unwanted, generic, or gibberish.
 */
function isUnwantedReview(text) {
  if (!text || typeof text !== 'string') return true;
  const trimmed = text.trim();

  // 1. Length check (< 25 characters is almost always superficial)
  if (trimmed.length < 25) return true;

  // 2. Encoding artifact check (broken unicode replacements like \uFFFD)
  if (trimmed.includes('\uFFFD') || trimmed.includes('\uFFFD')) return true;

  const normalized = normalizeText(trimmed);

  // 3. Exact match against generic phrases
  if (GENERIC_PHRASES.includes(normalized)) return true;

  // 4. Starts or ends with generic praise without specific fashion/wishlist/sizing/price context
  const isGenericShort = trimmed.length < 45 && GENERIC_PHRASES.some(phrase => normalized.startsWith(phrase) || normalized === phrase);
  if (isGenericShort) {
    const hasSpecificKeyword = ['size', 'fit', 'wishlist', 'return', 'exchange', 'fabric', 'dress', 'kurta', 'shoes', 'jeans', 'price', 'eors', 'quality', 'brand', 'instagram', 'youtube', 'chart', 'measurement'].some(k => normalized.includes(k));
    if (!hasSpecificKeyword) return true;
  }

  return false;
}

/**
 * Deduplicates and cleans a raw dataset.
 */
function cleanAndDeduplicateRawDataset(rawList) {
  const seenHashes = new Set();
  const cleanedList = [];
  let duplicateCount = 0;
  let unwantedCount = 0;

  rawList.forEach((item, idx) => {
    if (!item || !item.text) {
      unwantedCount++;
      return;
    }

    // Unwanted review filter
    if (isUnwantedReview(item.text)) {
      unwantedCount++;
      return;
    }

    // Deduplication check
    const normalized = normalizeText(item.text);
    if (seenHashes.has(normalized)) {
      duplicateCount++;
      return;
    }

    seenHashes.add(normalized);
    cleanedList.push(item);
  });

  console.log(`Cleaning Results:`);
  console.log(`- Original count: ${rawList.length}`);
  console.log(`- Duplicates removed: ${duplicateCount}`);
  console.log(`- Unwanted / generic reviews removed: ${unwantedCount}`);
  console.log(`- Cleaned high-quality reviews retained: ${cleanedList.length}`);

  return cleanedList;
}

/**
 * Runs dataset cleaning across Data/ and data/ folders.
 */
function runDatasetCleaning() {
  const dataDir = path.join(__dirname, '../Data');
  const rawPath = path.join(dataDir, 'myntra_raw_feedback.json');

  if (!fs.existsSync(rawPath)) {
    console.error('Raw feedback file not found!');
    return;
  }

  const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
  const cleanedRaw = cleanAndDeduplicateRawDataset(rawData);

  // Extract structured 20-attribute research DB from cleaned dataset
  console.log('Re-extracting 20-attribute research database from cleaned reviews...');
  const cleanedExtracted = processRawFeedbackDataset(cleanedRaw);

  const rawJSON = JSON.stringify(cleanedRaw, null, 2);
  const dbJSON = JSON.stringify(cleanedExtracted, null, 2);

  const targetDirs = [
    path.join(__dirname, '../data'),
    path.join(__dirname, '../Data')
  ];

  targetDirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'myntra_raw_feedback.json'), rawJSON);
    fs.writeFileSync(path.join(dir, 'myntra_extracted_db.json'), dbJSON);
  });

  console.log('Cleaned and deduplicated datasets saved successfully!');
}

if (require.main === module) {
  runDatasetCleaning();
}

module.exports = {
  isUnwantedReview,
  cleanAndDeduplicateRawDataset,
  runDatasetCleaning
};
