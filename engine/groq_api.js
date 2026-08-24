/**
 * Groq API Integration Client for Myntra AI Discovery Engine.
 * Connects to Groq Cloud API (Llama 3.3 70B / Llama 3 8B) for ultra-fast LLM extraction & synthesis.
 * Uses GROQ_API_KEY environment variable.
 */

require('dotenv').config();
const http = require('http');
const https = require('https');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama3-70b-8192';

/**
 * Sends a chat completion request to Groq Cloud API.
 * 
 * @param {string} prompt User text or structured extraction prompt
 * @param {string} systemInstruction System context instruction
 * @param {boolean} jsonMode Force JSON output format
 * @returns {Promise<Object|string>} Generated LLM output
 */
async function callGroqAPI(prompt, systemInstruction = 'You are a senior fashion growth researcher for Myntra.', jsonMode = false) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.warn('Warning: GROQ_API_KEY is not set in .env. Operating in local engine fallback mode.');
    return null;
  }

  const payload = {
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1, // Low temperature for deterministic zero-hallucination research
    max_tokens: 1000
  };

  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const dataString = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const url = new URL(GROQ_API_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(dataString)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(body);
            const content = parsed.choices[0].message.content;
            if (jsonMode) {
              try {
                resolve(JSON.parse(content));
              } catch (e) {
                resolve(content);
              }
            } else {
              resolve(content);
            }
          } catch (e) {
            reject(new Error(`Failed to parse Groq API response: ${e.message}`));
          }
        } else {
          reject(new Error(`Groq API returned HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Groq API Network Error: ${err.message}`));
    });

    req.write(dataString);
    req.end();
  });
}

/**
 * Uses Groq LLM to extract 20-attribute research schema from raw text.
 */
async function extractEvidenceWithGroq(rawText) {
  const systemInstruction = `You are a strict data extraction AI for Myntra fashion discovery research.
Extract the user statement into a JSON object matching this schema:
{
  "user_intent": string or null,
  "wishlist_behavior": string or null,
  "purchase_status": "Abandoned" | "Postponed" | "Bought elsewhere" | "Purchased" | "Wishlisted / Pending",
  "purchase_barrier": string or null,
  "uncertainty": string or null,
  "information_needed": array of strings or null,
  "alternative_considered": string or null,
  "external_research": array of strings or null,
  "workaround": string or null,
  "user_segment": "Gen Z / Myntra FWD" | "Working Professional" | "EORS Sale Shopper" | "Occasional / Event Shopper",
  "fashion_category": "Westernwear" | "Ethnic Wear" | "Footwear" | "Lingerie & Activewear" | "Beauty & Grooming",
  "journey_stage": string or null,
  "sentiment": "Positive" | "Neutral" | "Negative",
  "evidence_strength": "High" | "Medium" | "Low",
  "theme": string,
  "sub_theme": string or null
}
Rule: If a field is not explicitly present, set it strictly to null. Do NOT invent missing details. Return valid JSON only.`;

  const prompt = `Extract research attributes from this customer statement: "${rawText}"`;

  try {
    const result = await callGroqAPI(prompt, systemInstruction, true);
    return result;
  } catch (err) {
    console.warn(`Groq extraction fallback: ${err.message}`);
    return null;
  }
}

/**
 * Uses Groq LLM to synthesize research findings across evidence records.
 */
async function synthesizeWithGroq(query, evidenceRecords) {
  const sampleExcerpts = evidenceRecords.slice(0, 5).map(r => `- "${r.text}" (Source: ${r.source}, Barrier: ${r.purchase_barrier})`).join('\n');
  
  const systemInstruction = 'You are a senior fashion growth strategist at Myntra. Synthesize empirical findings based ONLY on provided customer evidence.';
  const prompt = `Research Query: "${query}"\n\nSupporting Customer Evidence:\n${sampleExcerpts}\n\nSynthesize a 2-sentence research insight highlighting the primary conversion barrier and user workaround.`;

  try {
    const output = await callGroqAPI(prompt, systemInstruction, false);
    return output;
  } catch (err) {
    console.warn(`Groq synthesis fallback: ${err.message}`);
    return null;
  }
}

module.exports = {
  callGroqAPI,
  extractEvidenceWithGroq,
  synthesizeWithGroq,
  DEFAULT_MODEL
};
