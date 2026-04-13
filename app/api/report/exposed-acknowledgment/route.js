import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const MODEL = 'claude-sonnet-4-20250514';

const SYSTEM_PROMPT = `Generate a one-paragraph acknowledgment for someone who received an Exposed verdict. Name 2 specific Zone 1 capabilities the assessment confirmed they bring — these must appear before any mention of exposure. Warm, direct, not consoling. Return JSON: { acknowledgment: string }`;

function textFromMessage(response) {
  const blocks = response?.content;
  if (!Array.isArray(blocks)) return '';
  return blocks
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('');
}

function parseJson(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('Empty model response');
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(raw);
  const jsonStr = fence ? fence[1].trim() : raw;
  const parsed = JSON.parse(jsonStr);
  if (typeof parsed.acknowledgment !== 'string') {
    throw new Error('Invalid acknowledgment shape');
  }
  return { acknowledgment: parsed.acknowledgment.trim() };
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

    const body = await req.json().catch(() => ({}));
    const primary_finding = body?.primary_finding;
    const zone = body?.zone;
    if (primary_finding == null || zone == null) {
      return NextResponse.json(
        { error: 'Expected primary_finding and zone.' },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const userContent = `Primary finding: ${String(primary_finding)}\nZone: ${String(zone)}`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }]
    });

    const text = textFromMessage(response);
    const result = parseJson(text);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Acknowledgment request failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
