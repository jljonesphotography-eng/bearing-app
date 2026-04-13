import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { isAnthropicOverloadOrServerError } from '@/app/lib/anthropic-capacity';

const MODEL = 'claude-sonnet-4-20250514';

const PLAIN_DELIM = '||PLAIN||';

const SYSTEM_PROMPT = `You are extracting structured assessment results from a Human Capability Intelligence conversation. Read the full conversation and extract the following fields as JSON with no preamble and no markdown backticks. Base everything strictly on what was observed in this conversation.

Required JSON keys: verdict, primary_finding, zone, energy_profile, action_1, action_2, action_3, dim_judgment, dim_relational, dim_synthesis, dim_creative, dim_adaptive.

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
Each action item must be returned as a single string for action_1, action_2, and action_3 in this exact format with newlines between each line:
WHAT — [the specific action, one sentence, direct, no jargon]
WHY NOW — [why this matters at this exact moment in their career given what was observed, one sentence]
THIS WEEK — [one concrete example of what doing this looks like in the next 7 days, specific not abstract]
WHAT CHANGES — [what will be different when they do this consistently, one sentence tied to their specific finding]
Use this format exactly. No deviation. Every action item must have all four lines.`;

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
      max_tokens: 4096,
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
