/**
 * Data Ingestion Pipeline for Real Review Datasets in Data/ folder.
 * Ingests CSV datasets (App Store, Play Store, Google Play Scraper),
 * filters meaningful fashion reviews, extracts 20-attribute research evidence,
 * and updates myntra_extracted_db.json & myntra_raw_feedback.json.
 */

const fs = require('fs');
const path = require('path');
const { extractEvidenceFromRawText } = require('./extraction');

/**
 * Basic robust CSV parser for double-quoted and comma-separated rows
 */
function parseCSV(content) {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVRow(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parsedRow = parseCSVRow(line);
    if (parsedRow.length === headers.length) {
      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h.replace(/^"|"$/g, '').trim()] = parsedRow[idx].replace(/^"|"$/g, '').trim();
      });
      rows.push(rowObj);
    }
  }

  return { headers, rows };
}

function parseCSVRow(rowStr) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];
    if (char === '"' && (i === 0 || rowStr[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Ingest App Store Reviews CSV
 */
function ingestAppStoreCSV(filePath) {
  console.log(`Ingesting App Store CSV: ${path.basename(filePath)}`);
  const content = fs.readFileSync(filePath, 'utf8');
  const { rows } = parseCSV(content);

  const rawItems = [];
  rows.forEach((row, idx) => {
    const text = row.Review || row.text || '';
    if (text.length > 20) { // filter out superficial 1-word reviews
      rawItems.push({
        id: `APPSTORE-${idx + 1}`,
        source: 'App Store',
        source_url: `https://apps.apple.com/in/app/myntra/id907394059?review=${idx + 1}`,
        date: row.Date || new Date().toISOString(),
        text: text,
        rating: parseInt(row.Rating || row.score || row.rate, 10) || null,
        raw_author: row.Author || 'AppStoreUser',
        platform_context: 'iOS App Store Review'
      });
    }
  });

  console.log(`Found ${rawItems.length} informative App Store reviews.`);
  return rawItems;
}

/**
 * Ingest Android Play Store Reviews CSV
 */
function ingestAndroidPlayStoreCSV(filePath) {
  console.log(`Ingesting Android Play Store CSV: ${path.basename(filePath)}`);
  const content = fs.readFileSync(filePath, 'utf8');
  const { rows } = parseCSV(content);

  const rawItems = [];
  rows.forEach((row, idx) => {
    const text = row.text || row.Review || '';
    if (text.length > 25) { // Filter out short ratings
      rawItems.push({
        id: `PLAYSTORE-${idx + 1}`,
        source: 'Play Store',
        source_url: `https://play.google.com/store/apps/details?id=com.myntra.android&review=${idx + 1}`,
        date: row.postedOn || row.date || new Date().toISOString(),
        text: text,
        rating: parseInt(row.rate || row.score || row.Rating, 10) || null,
        raw_author: row.userName || 'PlayStoreUser',
        platform_context: 'Android Play Store Review'
      });
    }
  });

  console.log(`Found ${rawItems.length} informative Play Store reviews.`);
  return rawItems;
}

/**
 * Ingest Google Play Scraper CSV
 */
function ingestGooglePlayScraperCSV(filePath) {
  console.log(`Ingesting Google Play Scraper CSV: ${path.basename(filePath)}`);
  const content = fs.readFileSync(filePath, 'utf8');
  const { rows } = parseCSV(content);

  const rawItems = [];
  rows.forEach((row, idx) => {
    const text = row.text || '';
    if (text.length > 25) {
      rawItems.push({
        id: `PLAY-SCRAPE-${idx + 1}`,
        source: 'Play Store',
        source_url: row.url || `https://play.google.com/store/apps/details?id=com.myntra.android&review=${idx + 1}`,
        date: row.date || new Date().toISOString(),
        text: text,
        rating: parseInt(row.score || row.rate || row.scoreText, 10) || null,
        raw_author: row.userName || 'FashionAppUser',
        platform_context: row.appId || 'Google Play Store Review'
      });
    }
  });

  console.log(`Found ${rawItems.length} informative Scraped Play Store reviews.`);
  return rawItems;
}

/**
 * Main ingestion & shaping pipeline
 */
function runIngestionPipeline() {
  const dataDir = path.join(__dirname, '../Data');
  let allRawItems = [];

  // Load baseline seed data if present
  const seedPath = path.join(__dirname, '../data/myntra_raw_feedback.json');
  if (fs.existsSync(seedPath)) {
    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    allRawItems = allRawItems.concat(seed);
  }

  // 1. App Store CSV
  const appStorePath = path.join(dataDir, 'appstore-reviews-2026-08-22T06-08-27-603Z.csv');
  if (fs.existsSync(appStorePath)) {
    allRawItems = allRawItems.concat(ingestAppStoreCSV(appStorePath));
  }

  // 2. Android Play Store CSV
  const androidPath = path.join(dataDir, 'com.myntra.android-reviews.csv');
  if (fs.existsSync(androidPath)) {
    allRawItems = allRawItems.concat(ingestAndroidPlayStoreCSV(androidPath));
  }

  // 3. Scraped Google Play CSV
  const scrapedPath = path.join(dataDir, 'dataset_google-play-scraper_2026-08-21_08-12-52-534.csv');
  if (fs.existsSync(scrapedPath)) {
    allRawItems = allRawItems.concat(ingestGooglePlayScraperCSV(scrapedPath));
  }

  console.log(`Total raw reviews collected across all files: ${allRawItems.length}`);

  // Extract structured 20-attribute evidence records
  const extractedDb = [];
  allRawItems.forEach((item, idx) => {
    try {
      const extracted = extractEvidenceFromRawText(item);
      if (extracted && extracted.text) {
        extractedDb.push(extracted);
      }
    } catch (e) {
      // Ignore non-processable rows
    }
  });

  console.log(`Successfully shaped & extracted ${extractedDb.length} 20-attribute research evidence records.`);

  // Save updated databases to both Data/ and data/ directories
  const dbJSON = JSON.stringify(extractedDb, null, 2);
  const rawJSON = JSON.stringify(allRawItems, null, 2);

  const targets = [
    path.join(__dirname, '../data'),
    path.join(__dirname, '../Data')
  ];

  targets.forEach(targetDir => {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(path.join(targetDir, 'myntra_extracted_db.json'), dbJSON);
    fs.writeFileSync(path.join(targetDir, 'myntra_raw_feedback.json'), rawJSON);
  });

  console.log('Saved extracted database and raw feedback to data/ and Data/ directories successfully.');
}

if (require.main === module) {
  runIngestionPipeline();
}

module.exports = {
  runIngestionPipeline
};
