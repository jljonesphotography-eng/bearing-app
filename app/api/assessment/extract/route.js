import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { isAnthropicOverloadOrServerError } from '@/app/lib/anthropic-capacity';

const MODEL = 'claude-sonnet-4-20250514';

/** Output budget for full JSON including action_1/2/3 and dimension strings. */
const EXTRACT_MAX_TOKENS = 4000;

const PLAIN_DELIM = '||PLAIN||';

const SYSTEM_PROMPT = `You are extracting structured assessment results from a Human Capability Intelligence conversation. Read the full conversation and extract the following fields as JSON with no preamble and no markdown backticks. Base everything strictly on what was observed in this conversation.

Required JSON keys: verdict, primary_finding, zone, energy_profile, action_1, action_2, action_3, dim_judgment, dim_relational, dim_synthesis, dim_creative, dim_adaptive.

verdict: exactly one of: WELL_POSITIONED, TRANSITION_ADVISED, EXPOSED
primary_finding: one specific sentence naming the primary Zone 1 capability observed
zone: exactly one of: Zone 1, Zone 2, Zone 3, Zone 4
energy_profile: exactly one of: Build, Explore, Optimize, Honest Conversation

DIMENSION FINDINGS (dim_judgment, dim_relational, dim_synthesis, dim_creative, dim_adaptive)
Each dimension finding must be written in two parts separated by ||PLAIN||
Part 1: Professional observed finding with zone classification. Specific and evidence-based.
Part 2: Plain language translation. What a trusted friend would say. No jargon. Warm but direct.
Format: Part1||PLAIN||Part2

ACTION ITEMS (action_1, action_2, action_3)
Each action item must be a single string with exactly four complete sentences on four lines separated by \\n.

Use this exact format for every action item:
WHAT — [One complete sentence describing a specific action this person should take]
WHY NOW — [One complete sentence explaining why this matters urgently given what was observed]
THIS WEEK — [One complete sentence describing exactly what doing this looks like in the next 7 days]
WHAT CHANGES — [One complete sentence describing what will be different when they do this consistently]

Every sentence must be complete. Never end mid-thought. Each line must end with a period or appropriate punctuation. The WHAT line is a full action sentence. The WHY NOW line is a full urgency sentence. The THIS WEEK line is a full concrete example sentence. The WHAT CHANGES line is a full outcome sentence.`;

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
