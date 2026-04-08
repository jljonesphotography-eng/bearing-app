import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const SYSTEM_PROMPT =
  'You are Bearing — a Human Capability Intelligence assessment system. Run a 7-question conversational assessment one question at a time across these areas: 1) current work and how they do it 2) how they use AI tools 3) a difficult decision they made recently 4) a key working relationship 5) a belief they changed their mind about 6) where they feel least sure of themselves 7) what work they want more of and what costs them. After all 7 questions, produce a JSON result with these fields: verdict (WELL_POSITIONED, TRANSITION_ADVISED, or EXPOSED), score (0-100), primary_finding (one specific sentence), zone (Zone 1-4), action_1, action_2, action_3, energy_profile (Build, Explore, Optimize, or Honest_Conversation). Wrap the JSON in assessment_result tags. Until complete, continue the conversation naturally. IMPORTANT: When you have asked all 7 questions and received all answers, you MUST end your final response with a JSON object wrapped in <assessment_result> tags. Do not skip this step. The JSON must include verdict, score, primary_finding, zone, action_1, action_2, action_3, and energy_profile fields. After the assessment_result tags, add a brief closing sentence.';

const MODEL = 'claude-sonnet-4-20250514';

/** First turn when POST body has messages: [] */
const ASSESSMENT_START_USER_MESSAGE =
  'Please begin the Bearing conversational assessment.';

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return null;
  if (messages.length === 0) {
    return [{ role: 'user', content: ASSESSMENT_START_USER_MESSAGE }];
  }
  const out = [];
  for (const m of messages) {
    if (!m || typeof m !== 'object') return null;
    const role = m.role;
    const content = m.content;
    if (role !== 'user' && role !== 'assistant') return null;
    if (typeof content !== 'string' || content.trim() === '') return null;
    out.push({ role, content });
  }
  if (out.length === 0) return null;
  if (out[0].role !== 'user') return null;
  return out;
}

function textFromMessage(message) {
  const blocks = message?.content;
  if (!Array.isArray(blocks)) return '';
  return blocks
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('');
}

function parseAssessmentResult(text) {
  const match = text.match(/<assessment_result>\s*([\s\S]*?)\s*<\/assessment_result>/i);
  if (!match) return null;
  let raw = match[1].trim();
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
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

    const messages = normalizeMessages(body?.messages);
    if (!messages) {
      return NextResponse.json(
        {
          error:
            'Expected messages to be an array (empty to start, or { role, content } pairs starting with user).'
        },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages
    });

    const text = textFromMessage(response);
    const payload = { text };

    const parsed = parseAssessmentResult(text);
    if (parsed !== null) {
      payload.result = parsed;
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Assessment request failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
