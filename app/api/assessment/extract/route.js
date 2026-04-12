import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const MODEL = 'claude-sonnet-4-20250514';

const SYSTEM_PROMPT = `You are extracting structured assessment results from a Human Capability Intelligence conversation. Read the full conversation and extract the following fields as JSON with no preamble and no markdown backticks: verdict (exactly one of: WELL_POSITIONED, TRANSITION_ADVISED, EXPOSED), primary_finding (one specific sentence naming the primary Zone 1 capability observed), zone (exactly one of: Zone 1, Zone 2, Zone 3, Zone 4), energy_profile (exactly one of: Build, Explore, Optimize, Honest Conversation), action_1 (first specific action item), action_2 (second specific action item), action_3 (third specific action item), dim_judgment (one sentence on what was observed about their judgment depth), dim_relational (one sentence on relational intelligence observed), dim_synthesis (one sentence on synthesis capacity observed), dim_creative (one sentence on creative originality observed), dim_adaptive (one sentence on adaptive execution observed). Base everything strictly on what was observed in this conversation.`;

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

    if (parsed.energy_profile != null) {
      parsed.energy_profile = normalizeEnergyProfile(parsed.energy_profile);
    }

    return NextResponse.json({ result: parsed }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Assessment extraction failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
