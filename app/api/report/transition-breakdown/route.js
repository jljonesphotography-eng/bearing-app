import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const MODEL = 'claude-sonnet-4-20250514';

const SYSTEM_PROMPT = `Generate a Transition Advised breakdown. Return JSON: { strong_1: string, strong_2: string, build_1: string, build_2: string } where strong items name specific Zone 1 capabilities observed and build items name specific Zone 2/3 areas with a timeline.`;

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
  const keys = ['strong_1', 'strong_2', 'build_1', 'build_2'];
  for (const k of keys) {
    if (typeof parsed[k] !== 'string') throw new Error('Invalid transition breakdown shape');
  }
  return {
    strong_1: parsed.strong_1.trim(),
    strong_2: parsed.strong_2.trim(),
    build_1: parsed.build_1.trim(),
    build_2: parsed.build_2.trim()
  };
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
    const verdict = body?.verdict;
    const primary_finding = body?.primary_finding;
    const zone = body?.zone;
    if (verdict == null || primary_finding == null || zone == null) {
      return NextResponse.json(
        { error: 'Expected verdict, primary_finding, and zone.' },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const userContent = `Verdict: ${String(verdict)}\nPrimary finding: ${String(primary_finding)}\nZone: ${String(zone)}`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }]
    });

    const text = textFromMessage(response);
    const result = parseJson(text);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transition breakdown request failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
