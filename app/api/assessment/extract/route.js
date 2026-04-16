import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { isAnthropicOverloadOrServerError } from '@/app/lib/anthropic-capacity';

const MODEL = 'claude-sonnet-4-20250514';

/** Minimum 2000 so action_1/2/3 and dimension strings are not cut off mid-generation. */
const EXTRACT_MAX_TOKENS = Math.max(2000, 4096);

const PLAIN_DELIM = '||PLAIN||';

const SYSTEM_PROMPT = `ABSOLUTE RULE: Every sentence you write must be grammatically complete. Never end a sentence with a comma, dash, preposition, article, or conjunction. If you start a sentence, finish it. This applies to every field in the JSON output without exception.

You are extracting structured assessment results from a Human Capability Intelligence conversation. Read the full conversation and extract the following fields as JSON with no preamble and no markdown backticks. Base everything strictly on what was observed in this conversation.

Required JSON keys: verdict, primary_finding, zone, energy_profile, action_1, action_2, action_3, dim_judgment, dim_relational, dim_synthesis, dim_creative, dim_adaptive.

JSON output field format:
STRICT FORMAT BLOCK FOR ACTIONS:
"action_1": "STRICT FORMAT: You must output exactly four lines for this action item, each starting with the specific label followed by a long dash. \nWHAT — [A short, punchy strategy name]\nWHY NOW — [Why this is urgent based on their specific AI displacement risks]\nTHIS WEEK — [One concrete, non-generic step they can take in the next 7 days]\nWHAT CHANGES — [The specific behavioral or professional shift this creates]\n\nDo not include any other text or conversational filler."
"action_2": "STRICT FORMAT: You must output exactly four lines for this action item, each starting with the specific label followed by a long dash. \nWHAT — [A short, punchy strategy name]\nWHY NOW — [Why this is urgent based on their specific AI displacement risks]\nTHIS WEEK — [One concrete, non-generic step they can take in the next 7 days]\nWHAT CHANGES — [The specific behavioral or professional shift this creates]\n\nDo not include any other text or conversational filler."
"action_3": "STRICT FORMAT: You must output exactly four lines for this action item, each starting with the specific label followed by a long dash. \nWHAT — [A short, punchy strategy name]\nWHY NOW — [Why this is urgent based on their specific AI displacement risks]\nTHIS WEEK — [One concrete, non-generic step they can take in the next 7 days]\nWHAT CHANGES — [The specific behavioral or professional shift this creates]\n\nDo not include any other text or conversational filler."
CRITICAL: Every line must be a complete sentence. Do not stop mid-sentence. The WHAT line must be a complete actionable instruction. The WHY NOW line must be a complete sentence explaining urgency. The THIS WEEK line must be a complete concrete example. The WHAT CHANGES line must be a complete outcome sentence. If a sentence feels too long, shorten it — but never leave it incomplete.
DO NOT include any introductory text or closing remarks. Start every action item directly with the word WHAT followed by a long dash (—).

verdict: exactly one of: WELL_POSITIONED, TRANSITION_ADVISED, EXPOSED
primary_finding: one specific sentence naming the primary Zone 1 capability observed
zone: exactly one of: Zone 1, Zone 2, Zone 3, Zone 4
energy_profile: exactly one of: Build, Explore, Optimize, Honest Conversation

DIMENSION FINDINGS (dim_judgment, dim_relational, dim_synthesis, dim_creative, dim_adaptive)
For each dimension, write one sentence on what was observed for that dimension (judgment depth, relational intelligence, synthesis capacity, creative originality, adaptive execution respectively). Each must be specific to this person and evidence-based; never generic.

Each dimension finding must be written in two parts, separated by the delimiter ||PLAIN||
Part 1 (before ||PLAIN||): The observed finding. Professional, specific, evidence-based. Written in the current style — what was actually demonstrated, with zone classification. Example: 'Strong Zone 1 — demonstrated the ability to construct new frameworks when existing patterns failed, with consistent evidence of judgment under relational and informational ambiguity.'
Part 2 (after ||PLAIN||): The plain language translation. Written as a trusted friend who knows this person would speak. No jargon. No zone numbers. No technical terms. What it means in real life, right now, for this specific person. Warm but not soft. Direct but not clinical. Example: 'You make good calls in situations where most people freeze. People come to you specifically when they don't know who else to ask — that's not common, and it's not something AI can replicate.'
The plain language part should feel like the most useful thing a coach could say to this person in this moment. Never generic. Always specific to what was actually observed.

Each dim_* value in the JSON must be a single string in the form: Part1||PLAIN||Part2 (use the exact delimiter ||PLAIN|| with no spaces inside the delimiter).

ACTION ITEMS (action_1, action_2, action_3)
CRITICAL: Each action item MUST use this exact format. No exceptions.

action_1, action_2, and action_3 must each be a single string formatted EXACTLY like this example:
"WHAT — Document the three decisions you made this year that others couldn't have made\nWHY NOW — Your judgment is invisible because it looks effortless, and that invisibility is costing you\nTHIS WEEK — Write one paragraph describing one decision outcome as a business result, not a process\nWHAT CHANGES — Decision-makers will start seeing your judgment as an asset rather than assuming things just worked out"

Rules:
- Use \n between each line (literal newline in the string)
- Start each line with exactly: WHAT — / WHY NOW — / THIS WEEK — / WHAT CHANGES —
- Use em dash — not hyphen -
- No extra text before WHAT or after the WHAT CHANGES line
CRITICAL FORMAT REMINDER: action_1, action_2, and action_3 MUST each contain exactly four lines separated by newline characters. Line 1 starts with WHAT — , Line 2 starts with WHY NOW — , Line 3 starts with THIS WEEK — , Line 4 starts with WHAT CHANGES — . Do not write prose. Do not combine lines. Four lines per action item, every time, no exceptions.
- All four lines required in every action item`;

function textFromMessage(response) {
  const blocks = response?.content;
  if (!Array.isArray(blocks)) return '';
  return blocks
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('');
}

function formatConversation(messages) {
  if (!Array.isArray(messages)) return '';
  return messages
    .map((m) => {
      if (!m || typeof m !== 'object') return '';
      const role = m.role === 'assistant' ? 'Assistant' : 'User';
      const content = typeof m.content === 'string' ? m.content : '';
      return `${role}: ${content}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

function parseExtractedJson(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('Empty model response');

  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(raw);
  const jsonStr = fence ? fence[1].trim() : raw;

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    const start = jsonStr.indexOf('{');
    const end = jsonStr.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('Could not parse JSON from extraction response.');
    parsed = JSON.parse(jsonStr.slice(start, end + 1));
  }

  return parsed;
}

/** Split model output "observed||PLAIN||plain" into dim_* (observed only) and dim_*_plain. */
function applyDimensionPlainSplit(parsed) {
  const dimKeys = ['dim_judgment', 'dim_relational', 'dim_synthesis', 'dim_creative', 'dim_adaptive'];
  for (const key of dimKeys) {
    const raw = parsed[key];
    if (raw == null) continue;
    const s = String(raw).trim();
    if (!s) {
      parsed[key] = null;
      continue;
    }
    const idx = s.indexOf(PLAIN_DELIM);
    if (idx === -1) {
      parsed[key] = s;
      parsed[`${key}_plain`] = null;
      continue;
    }
    const observed = s.slice(0, idx).trim();
    const plain = s.slice(idx + PLAIN_DELIM.length).trim();
    parsed[key] = observed || null;
    parsed[`${key}_plain`] = plain || null;
  }
  return parsed;
}

function normalizeEnergyProfile(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const lower = s.toLowerCase().replace(/\s+/g, ' ');
  if (lower === 'build') return 'Build';
  if (lower === 'explore') return 'Explore';
  if (lower === 'optimize') return 'Optimize';
  if (
    lower === 'honest conversation' ||
    (lower.includes('honest') && lower.includes('conversation'))
  ) {
    return 'Honest_Conversation';
  }
  return s;
}

export async function POST(req) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing ANTHROPIC_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const messages = body?.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Expected a non-empty messages array (full conversation history).' },
        { status: 400 }
      );
    }

    const conversationText = formatConversation(messages);
    if (!conversationText.trim()) {
      return NextResponse.json(
        { error: 'Conversation text was empty after formatting.' },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const userContent = `Full conversation to analyze:\n\n${conversationText}`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: EXTRACT_MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }]
    });

    const text = textFromMessage(response);
    const parsed = parseExtractedJson(text);
    applyDimensionPlainSplit(parsed);

    if (parsed.energy_profile != null) {
      parsed.energy_profile = normalizeEnergyProfile(parsed.energy_profile);
    }

    return NextResponse.json({ result: parsed }, { status: 200 });
  } catch (err) {
    console.error('[api/assessment/extract]', err);
    if (isAnthropicOverloadOrServerError(err)) {
      return NextResponse.json({ error: 'ai_capacity' }, { status: 503 });
    }
    return NextResponse.json(
      { error: 'Could not extract assessment results. Please try again.' },
      { status: 500 }
    );
  }
}
