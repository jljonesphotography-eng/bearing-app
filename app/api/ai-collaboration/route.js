import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const MODEL = 'claude-sonnet-4-20250514';

const SYSTEM_PROMPT = `You are generating a personalized AI collaboration guide based on a Human Capability Intelligence assessment. The person has received their capability verdict and primary finding. Your job is to tell them specifically how AI is moving in their domain and exactly how to use AI to amplify what the assessment found they bring. Be specific and direct — not generic. No motivational language. No phrases like future-proof, stay ahead, unlock potential, or AI-ready. Respond only in JSON with no preamble and no markdown backticks.`;

function buildUserMessage({ verdict, primary_finding, zone, energy_profile }) {
  return `Verdict: ${verdict}. Primary finding: ${primary_finding}. Zone: ${zone}. Engagement profile: ${energy_profile}. Generate a personalized AI collaboration guide as JSON with exactly these keys: domain_shift (one paragraph — where AI is already operating in this person's domain based on their primary finding, what they should stop investing energy in), amplification_methods (array of exactly 3 strings — specific ways this person can use AI to extend their Zone 1 capability, each one concrete and named, not generic), next_skill (one sentence — the single most important skill to build in the next 30 days based on what the assessment found).`;
}

function textFromMessage(response) {
  const blocks = response?.content;
  if (!Array.isArray(blocks)) return '';
  return blocks
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

function parseGuideJson(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('Empty model response');

  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(raw);
  const jsonStr = fence ? fence[1].trim() : raw;

  const parsed = JSON.parse(jsonStr);
  if (
    typeof parsed.domain_shift !== 'string' ||
    !Array.isArray(parsed.amplification_methods) ||
    parsed.amplification_methods.length !== 3 ||
    typeof parsed.next_skill !== 'string'
  ) {
    throw new Error('Invalid guide shape');
  }
  if (!parsed.amplification_methods.every((s) => typeof s === 'string')) {
    throw new Error('Invalid amplification_methods');
  }

  return {
    domain_shift: parsed.domain_shift.trim(),
    amplification_methods: parsed.amplification_methods.map((s) => String(s).trim()),
    next_skill: parsed.next_skill.trim()
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

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const verdict = body?.verdict;
    const primary_finding = body?.primary_finding;
    const zone = body?.zone;
    const energy_profile = body?.energy_profile;

    if (
      verdict == null ||
      primary_finding == null ||
      zone == null ||
      energy_profile == null
    ) {
      return NextResponse.json(
        { error: 'Expected verdict, primary_finding, zone, and energy_profile.' },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const userMessage = buildUserMessage({
      verdict: String(verdict),
      primary_finding: String(primary_finding),
      zone: String(zone),
      energy_profile: String(energy_profile)
    });

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    });

    const text = textFromMessage(response);
    const guide = parseGuideJson(text);

    return NextResponse.json(guide, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'AI collaboration guide request failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
