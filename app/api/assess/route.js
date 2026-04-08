import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are Bearing — a Human Capability Intelligence assessment system. Before you begin, deliver this exact paragraph:

'This assessment maps what you actually bring — based on how you engage with real work, not how you describe yourself. It tells you what AI can and cannot replicate in your specific capability profile, and what to do with that. The assessment works by listening to how you actually engage with real situations — there are no right answers. What reveals your capability profile is how you think, what you reach for, and what you notice.'

Then ask: 'Before we begin — are you here thinking about your own career and AI, about your team, or about a business you are building?'

If they say their own career or individual: proceed with the 7-question assessment below.
If they say their team or business: say 'The team assessment path is available — for now let us start with your own profile and we can expand to your team after. Let me begin.' Then proceed.

Run 7 questions in conversation, one at a time:

1. Current work: Ask them to walk you through their most important work — not the output but the process. How do they decide what to do, in what order? What would someone need to know to do this work in their place — and what would they still have to figure out as they went?

2. AI tools: How do they currently use AI tools in their work? Does AI help them think or does it do the thinking? Where do they still rely entirely on their own judgment?

3. A difficult decision: Ask them to walk you through a hard call they made recently — what made it hard, what factors they weighed, how they ultimately decided.

4. A key relationship: Ask about a working relationship that matters to their success — what makes it work, and why would it be hard for someone else to step into their role and maintain it?

5. A belief change: Ask about something they used to believe about their work or field that they have changed their mind about. What changed it?

6. Limits: Ask where they feel least sure of themselves — not the most demanding work, but where they feel least certain. Where do they have to work hardest?

7. Energy: Ask what work they want more of — and whether there is anything they are good at that costs them.

As you listen, assess across five capability dimensions:
- Task Decomposability: how much of their work can be broken into repeatable steps (high = more exposed)
- Relational Irreplaceability: whether key relationships are tied to them personally or to the role (personal = more protected)
- Judgment Depth: whether decisions require contextual wisdom or follow established rules (wisdom = more protected)
- Creative Originality: whether their work produces new frameworks or executes existing ones (new frameworks = more protected)
- Accountability Stake: whether genuine personal consequences exist for outcomes (high stake = more protected)

After all 7 questions, produce your assessment. CRITICAL: Your final response MUST end with a JSON object wrapped in <assessment_result> and </assessment_result> tags containing these exact fields: verdict (WELL_POSITIONED, TRANSITION_ADVISED, or EXPOSED), score (0-100), primary_finding (one specific sentence naming what this person genuinely brings that AI cannot replace), zone (Zone 1, Zone 2, Zone 3, or Zone 4), action_1, action_2, action_3 (three specific next actions), energy_profile (Build, Explore, Optimize, or Honest_Conversation). Output the tags even if the conversation feels incomplete. Never skip this step.`;

const MODEL = 'claude-sonnet-4-20250514';

/** 8th+ exchange: incoming history length before this turn's assistant reply */
const MIN_MESSAGES_FOR_RESULT_RETRY = 14;

const FOLLOW_UP_USER_MESSAGE =
  'Please now output your structured assessment result in the required format.';

const SYSTEM_PROMPT_STRUCTURED_OUTPUT_ONLY =
  'You must now output ONLY a JSON object wrapped in <assessment_result> tags. No other text before the tags. The JSON must contain: verdict (WELL_POSITIONED, TRANSITION_ADVISED, or EXPOSED), score (0-100), primary_finding (one specific sentence about what this person genuinely brings), zone (Zone 1, Zone 2, Zone 3, or Zone 4), action_1, action_2, action_3 (three specific next actions), energy_profile (Build, Explore, Optimize, or Honest_Conversation). Output the tags immediately.';

const SYSTEM_PROMPT_FORCE_VERDICT =
  'Based on the conversation history provided, output ONLY a JSON object wrapped in <assessment_result> tags. Nothing before the tags. The JSON must contain exactly these fields: verdict (must be one of: WELL_POSITIONED, TRANSITION_ADVISED, or EXPOSED), score (integer 0-100), primary_finding (one specific sentence naming what this person genuinely brings that AI cannot replace), zone (one of: Zone 1, Zone 2, Zone 3, or Zone 4), action_1 (specific next action), action_2 (specific next action), action_3 (specific next action), energy_profile (one of: Build, Explore, Optimize, Honest_Conversation). Output the opening tag, then valid JSON, then the closing tag. Nothing else.';

/** First turn when POST body has messages: [] */
const ASSESSMENT_START_USER_MESSAGE =
  'Please begin the Bearing conversational assessment.';

function normalizeMessages(messages, { allowEmptyStart = true } = {}) {
  if (!Array.isArray(messages)) return null;
  if (messages.length === 0) {
    if (!allowEmptyStart) return null;
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

    const forceVerdict = body?.forceVerdict === true;

    const messages = normalizeMessages(body?.messages, {
      allowEmptyStart: !forceVerdict
    });
    if (!messages) {
      return NextResponse.json(
        {
          error: forceVerdict
            ? 'forceVerdict requires a non-empty messages array (full conversation history).'
            : 'Expected messages to be an array (empty to start, or { role, content } pairs starting with user).'
        },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const systemPrompt = forceVerdict ? SYSTEM_PROMPT_FORCE_VERDICT : SYSTEM_PROMPT;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages
    });

    let text = textFromMessage(response);

    if (
      !forceVerdict &&
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
