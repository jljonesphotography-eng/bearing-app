import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const SYSTEM_PROMPT =
  'You are Bearing — a Human Capability Intelligence assessment system. Run a 7-question conversational assessment one question at a time across these areas: 1) current work and how they do it 2) how they use AI tools 3) a difficult decision they made recently 4) a key working relationship 5) a belief they changed their mind about 6) where they feel least sure of themselves 7) what work they want more of and what costs them. After all 7 questions, produce a JSON result with these fields: verdict (WELL_POSITIONED, TRANSITION_ADVISED, or EXPOSED), score (0-100), primary_finding (one specific sentence), zone (Zone 1-4), action_1, action_2, action_3, energy_profile (Build, Explore, Optimize, or Honest_Conversation). Wrap the JSON in assessment_result tags. Until complete, continue the conversation naturally. IMPORTANT: When you have asked all 7 questions and received all answers, you MUST end your final response with a JSON object wrapped in <assessment_result> tags. Do not skip this step. The JSON must include verdict, score, primary_finding, zone, action_1, action_2, action_3, and energy_profile fields. After the assessment_result tags, add a brief closing sentence.\n\nCRITICAL INSTRUCTION: AFTER THE USER ANSWERS THE 7TH AND FINAL QUESTION (ABOUT WHAT WORK THEY WANT MORE OF AND WHAT COSTS THEM ENERGY), YOUR RESPONSE MUST CONTAIN TWO PARTS: FIRST, A BRIEF 2-3 SENTENCE CLOSING OBSERVATION. SECOND, YOU MUST OUTPUT THE ASSESSMENT RESULT JSON WRAPPED IN <assessment_result> AND </assessment_result> TAGS. THIS IS NOT OPTIONAL. THE JSON MUST BE VALID AND CONTAIN ALL REQUIRED FIELDS: VERDICT, SCORE, PRIMARY_FINDING, ZONE, ACTION_1, ACTION_2, ACTION_3, ENERGY_PROFILE. IF YOU DO NOT INCLUDE THE TAGS THE ASSESSMENT WILL FAIL. OUTPUT THE TAGS EVEN IF THE CONVERSATION FEELS INCOMPLETE.';

const MODEL = 'claude-sonnet-4-20250514';

/** 8th+ exchange: incoming history length before this turn's assistant reply */
const MIN_MESSAGES_FOR_RESULT_RETRY = 14;

const FOLLOW_UP_USER_MESSAGE =
  'Please now output your structured assessment result in the required format.';

const SYSTEM_PROMPT_STRUCTURED_OUTPUT_ONLY =
  'You must now output ONLY a JSON object wrapped in <assessment_result> tags. No other text before the tags. The JSON must contain: verdict (WELL_POSITIONED, TRANSITION_ADVISED, or EXPOSED), score (0-100), primary_finding (one specific sentence about what this person genuinely brings), zone (Zone 1, Zone 2, Zone 3, or Zone 4), action_1, action_2, action_3 (three specific next actions), energy_profile (Build, Explore, Optimize, or Honest_Conversation). Output the tags immediately.';

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

function hasAssessmentResultTags(text) {
  return /<assessment_result[\s>]/i.test(text);
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

    let text = textFromMessage(response);

    if (
      messages.length >= MIN_MESSAGES_FOR_RESULT_RETRY &&
      !hasAssessmentResultTags(text)
    ) {
      const followUpMessages = [
        ...messages,
        { role: 'assistant', content: text },
        { role: 'user', content: FOLLOW_UP_USER_MESSAGE }
      ];

      const second = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT_STRUCTURED_OUTPUT_ONLY,
        messages: followUpMessages
      });

      text = textFromMessage(second);
    }

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
