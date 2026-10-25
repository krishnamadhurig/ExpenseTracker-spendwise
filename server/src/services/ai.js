const config = require('../config');

const API_URL = 'https://api.anthropic.com/v1/messages';

const KEYWORDS = {
  Food: ['restaurant', 'cafe', 'coffee', 'lunch', 'dinner', 'breakfast', 'pizza', 'burger', 'swiggy', 'zomato', 'biryani', 'snack', 'tea'],
  Groceries: ['grocery', 'groceries', 'vegetables', 'fruits', 'milk', 'supermarket', 'bigbasket', 'blinkit', 'zepto', 'dmart'],
  Transport: ['uber', 'ola', 'rapido', 'taxi', 'cab', 'bus', 'metro', 'train', 'fuel', 'petrol', 'diesel', 'parking'],
  Shopping: ['amazon', 'flipkart', 'myntra', 'clothes', 'shoes', 'shirt', 'mall', 'shopping'],
  Bills: ['electricity', 'water bill', 'internet', 'wifi', 'broadband', 'recharge', 'phone bill', 'insurance', 'emi'],
  Entertainment: ['movie', 'netflix', 'spotify', 'prime', 'hotstar', 'game', 'concert', 'subscription'],
  Health: ['doctor', 'medicine', 'pharmacy', 'hospital', 'gym', 'clinic', 'medical'],
  Travel: ['flight', 'hotel', 'resort', 'trip', 'irctc', 'airbnb'],
  Education: ['course', 'tuition', 'book', 'udemy', 'school', 'college', 'exam', 'fees'],
  Rent: ['rent', 'landlord', 'lease']
};

function ruleBasedCategory(text) {
  const t = String(text || '').toLowerCase();
  for (const [cat, words] of Object.entries(KEYWORDS)) if (words.some((w) => t.includes(w))) return cat;
  return 'Other';
}

async function callClaude({ system, prompt, maxTokens = 400 }) {
  if (!config.anthropicKey) return null;
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': config.anthropicKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: config.anthropicModel,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

function extractJson(text) {
  const m = text && text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

async function suggestCategory(name) {
  const fallback = ruleBasedCategory(name);
  try {
    const out = await callClaude({
      system: 'You categorize personal expenses. Reply with exactly one category name from the list and nothing else.',
      prompt: `Categories: ${config.categories.join(', ')}\nExpense: "${String(name).slice(0, 200)}"`,
      maxTokens: 10
    });
    const match = out && config.categories.find((c) => out.toLowerCase().includes(c.toLowerCase()));
    return match || fallback;
  } catch {
    return fallback;
  }
}

async function parseEntry(text) {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const out = await callClaude({
      system:
        'Extract one expense from the text. Reply with only a JSON object: {"name": string, "amount": number, "category": string, "date": "YYYY-MM-DD"}. ' +
        `Categories: ${config.categories.join(', ')}. Today is ${today}; resolve relative dates such as "yesterday".`,
      prompt: String(text).slice(0, 500),
      maxTokens: 150
    });
    const p = extractJson(out);
    if (p && Number(p.amount) > 0 && p.name) {
      return {
        name: String(p.name).slice(0, 120),
        amount: Number(p.amount),
        category: config.categories.includes(p.category) ? p.category : ruleBasedCategory(p.name),
        date: /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : today
      };
    }
  } catch {}

  const m = String(text).match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const name = String(text).replace(m[0], '').replace(/\b(spent|paid|for|on|rs\.?|inr|₹)\b/gi, '').replace(/\s+/g, ' ').trim() || 'Expense';
  return { name: name.charAt(0).toUpperCase() + name.slice(1, 120), amount: Number(m[1]), category: ruleBasedCategory(text), date: today };
}

async function generateInsights(summary) {
  try {
    const out = await callClaude({
      system:
        'You are a concise personal-finance coach. Given a JSON spending summary (amounts in INR), write 3-5 short, specific, actionable insights, one per line, each starting with "- ". No preamble.',
      prompt: JSON.stringify(summary),
      maxTokens: 450
    });
    if (out) {
      const lines = out.split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
      if (lines.length) return { source: 'ai', insights: lines };
    }
  } catch {}

  const insights = [];
  const top = summary.byCategory[0];
  if (top && summary.total > 0) insights.push(`${top.category} is your biggest category at ${Math.round((top.total / summary.total) * 100)}% of everything you've logged.`);
  if (summary.count > 0) insights.push(`Your average item costs about ₹${Math.round(summary.total / summary.count)}.`);
  if (summary.byCategory.length > 1) {
    const small = summary.byCategory[summary.byCategory.length - 1];
    insights.push(`${small.category} is your smallest category, so cutting there will save the least.`);
  }
  if (!insights.length) insights.push('Add a few items to get personalised insights.');
  return { source: 'rules', insights };
}

module.exports = { suggestCategory, parseEntry, generateInsights, ruleBasedCategory };