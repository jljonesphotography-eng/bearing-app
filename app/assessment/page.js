'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const NAVY = '#1B3A6B';
const BG = '#faf9f6';
const TEXT = '#1a1916';
const MUTED = '#6B6A66';
const SURFACE = '#ffffff';
const USER_TINT = 'rgba(27, 58, 107, 0.09)';

const FONT_SANS =
  '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';

/** Must match server default in app/api/assess/route.js when messages is [] */
const START_USER_MESSAGE =
  'Please begin the Bearing conversational assessment.';

/** System prompt closes the delivered assessment with this sentence — required before "Get My Assessment". */
const ASSESSMENT_CLOSING_PHRASE = 'What you do with that is yours.';

const ASSESS_AI_CAPACITY_MESSAGE =
  "Our AI engine is currently processing a high volume of assessments. We are holding your place in line—please wait 10 seconds and try clicking 'Send' again.";

function deepHasOverloadedInPayload(obj, depth = 0) {
  if (depth > 6 || obj == null || typeof obj !== 'object') return false;
  if (obj.type === 'overloaded_error') return true;
  if (obj.error?.type === 'overloaded_error') return true;
  for (const v of Object.values(obj)) {
    if (v != null && typeof v === 'object' && deepHasOverloadedInPayload(v, depth + 1)) {
      return true;
    }
  }
  return false;
}

function isAssessApiCapacityResponse(res, data) {
  if (data?.error === 'ai_capacity') return true;
  if (res.status === 529 || res.status >= 500) return true;
  if (deepHasOverloadedInPayload(data)) return true;
  const raw = data?.error;
  if (typeof raw === 'string') {
    if (/overloaded/i.test(raw) || /overloaded_error/i.test(raw)) return true;
    if (/\b529\b/.test(raw)) return true;
    const t = raw.trim();
    if (t.startsWith('{') || t.startsWith('[')) {
      try {
        const j = JSON.parse(raw);
        if (deepHasOverloadedInPayload(j)) return true;
      } catch {
        /* ignore */
      }
    }
  }
  if (raw != null && typeof raw === 'object' && deepHasOverloadedInPayload(raw)) {
    return true;
  }
  return false;
}

function userFacingAssessError(res, data, genericFallback) {
  if (isAssessApiCapacityResponse(res, data)) {
    return ASSESS_AI_CAPACITY_MESSAGE;
  }
  const raw = data?.error;
  if (typeof raw === 'string' && raw.length > 0) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return genericFallback;
    }
    return raw;
  }
  return genericFallback;
}

/** Last line of defense if the thrown Error.message still contains Anthropic JSON. */
function normalizeCaughtAssessError(e) {
  const raw = e instanceof Error ? e.message : String(e);
  if (
    /overloaded_error/i.test(raw) ||
    /\b529\b/.test(raw) ||
    /"type"\s*:\s*"overloaded_error"/i.test(raw)
  ) {
    return ASSESS_AI_CAPACITY_MESSAGE;
  }
  try {
    const j = JSON.parse(raw);
    if (deepHasOverloadedInPayload(j)) return ASSESS_AI_CAPACITY_MESSAGE;
  } catch {
    /* ignore */
  }
  return raw;
}

function stripAssessmentTags(text) {
  if (!text) return '';
  return text
    .replace(/<assessment_result>[\s\S]*?<\/assessment_result>/gi, '')
    .trim();
}

/** Mirrors server parsing: tags, optional ```json fences, brace slice fallback, then raw JSON */
function parseStructuredResultFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/<assessment_result>\s*([\s\S]*?)\s*<\/assessment_result>/i);
  if (match) {
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
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function logAssessResponse(context, data) {
  const text = data?.text ?? '';
  console.log(`[Bearing assess] ${context}`, {
    hasResultField: Boolean(data?.result),
    textLength: text.length,
    hasAssessmentResultTags: /<assessment_result[\s>]/i.test(text),
    textPreviewStart: text.slice(0, 280),
    textPreviewEnd: text.slice(-500),
    resultFromApi: data?.result ?? null
  });
}

function displayFromApiMessages(apiMessages) {
  return apiMessages.filter(
    (m, i) =>
      !(
        i === 0 &&
        m.role === 'user' &&
        m.content === START_USER_MESSAGE
      )
  );
}

const DIM_PLAIN_SEP = '||PLAIN||';

/** Aligns with /api/assessment/extract: dim_* stores observed only; dim_*_plain stores coach voice. */
function normalizeDimensionFieldsForSave(result) {
  if (!result || typeof result !== 'object') return {};
  const keys = ['judgment', 'relational', 'synthesis', 'creative', 'adaptive'];
  const out = {};
  for (const k of keys) {
    const dimKey = `dim_${k}`;
    const plainKey = `${dimKey}_plain`;
    const existingPlain = result[plainKey];
    if (existingPlain != null && String(existingPlain).trim() !== '') {
      const obs = result[dimKey];
      out[dimKey] =
        obs != null && String(obs).trim() !== '' ? String(obs).trim() : null;
      out[plainKey] = String(existingPlain).trim();
      continue;
    }
    const combined = result[dimKey] == null ? '' : String(result[dimKey]);
    const i = combined.indexOf(DIM_PLAIN_SEP);
    if (i === -1) {
      out[dimKey] = combined.trim() || null;
      out[plainKey] = null;
    } else {
      out[dimKey] = combined.slice(0, i).trim() || null;
      out[plainKey] = combined.slice(i + DIM_PLAIN_SEP.length).trim() || null;
    }
  }
  return out;
}

export default function AssessmentPage() {
  const router = useRouter();
  const bottomRef = useRef(null);
  const [apiMessages, setApiMessages] = useState([]);
  const [awaiting, setAwaiting] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);
  const [savingAssessment, setSavingAssessment] = useState(false);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    return createClient(url, anonKey);
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [apiMessages, awaiting, scrollToBottom]);

  const callAssess = useCallback(
    async (messagesPayload, { forceVerdict = false } = {}) => {
      const res = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          forceVerdict
            ? { messages: messagesPayload, forceVerdict: true }
            : { messages: messagesPayload }
        )
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        if (res.status >= 500) {
          throw new Error(ASSESS_AI_CAPACITY_MESSAGE);
        }
        throw new Error('Assessment request failed.');
      }
      if (!res.ok) {
        throw new Error(
          userFacingAssessError(res, data, 'Assessment request failed.')
        );
      }
      return data;
    },
    []
  );

  const saveResultAndRedirect = useCallback(
    async (result) => {
      if (!supabase) {
        throw new Error('Missing Supabase configuration.');
      }
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        router.push('/login');
        return;
      }

      const scoreRaw = result.score;
      const totalScore =
        typeof scoreRaw === 'number'
          ? scoreRaw
          : Number.parseFloat(String(scoreRaw));

      const dims = normalizeDimensionFieldsForSave(result);

      const insertData = {
        user_id: user.id,
        total_score: Number.isFinite(totalScore) ? totalScore : null,
        verdict: result.verdict ?? null,
        primary_finding: result.primary_finding ?? null,
        zone: result.zone ?? null,
        action_1: result.action_1 ?? null,
        action_2: result.action_2 ?? null,
        action_3: result.action_3 ?? null,
        energy_profile: result.energy_profile ?? null,
        status: 'completed',
        ...(dims.dim_judgment && { dim_judgment: dims.dim_judgment }),
        ...(dims.dim_relational && { dim_relational: dims.dim_relational }),
        ...(dims.dim_synthesis && { dim_synthesis: dims.dim_synthesis }),
        ...(dims.dim_creative && { dim_creative: dims.dim_creative }),
        ...(dims.dim_adaptive && { dim_adaptive: dims.dim_adaptive }),
        ...(dims.dim_judgment_plain && { dim_judgment_plain: dims.dim_judgment_plain }),
        ...(dims.dim_relational_plain && { dim_relational_plain: dims.dim_relational_plain }),
        ...(dims.dim_synthesis_plain && { dim_synthesis_plain: dims.dim_synthesis_plain }),
        ...(dims.dim_creative_plain && { dim_creative_plain: dims.dim_creative_plain }),
        ...(dims.dim_adaptive_plain && { dim_adaptive_plain: dims.dim_adaptive_plain })
      };

      console.log('[Bearing assess] Saving to Supabase', insertData);

      const { error: insertError } = await supabase
        .from('assessment_submissions')
        .insert([insertData]);

      if (insertError) {
        console.log('Supabase error:', JSON.stringify(insertError));
        throw new Error(insertError.message || String(insertError));
      }

      if (typeof window !== 'undefined') {
        console.log('Navigating to dashboard');
        window.location.replace('/dashboard');
      }
    },
    [router, supabase]
  );

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setError(null);
      setAwaiting(true);
      try {
        const data = await callAssess([]);
        if (cancelled) return;

        logAssessResponse('initial /api/assess response', data);

        const assistantText = data.text ?? '';
        const result =
          data.result ?? parseStructuredResultFromText(assistantText);
        if (result && !data.result) {
          console.log(
            '[Bearing assess] Parsed result from assistant text (client fallback)',
            result
          );
        }

        setApiMessages([
          { role: 'user', content: START_USER_MESSAGE },
          { role: 'assistant', content: assistantText }
        ]);
        setStarted(true);

        if (result) {
          await saveResultAndRedirect(result);
        }
      } catch (e) {
        if (!cancelled) {
          setError(normalizeCaughtAssessError(e));
        }
      } finally {
        if (!cancelled) setAwaiting(false);
      }
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [callAssess, saveResultAndRedirect]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || awaiting || !started) return;

    setError(null);
    const nextApi = [...apiMessages, { role: 'user', content: trimmed }];
    setApiMessages(nextApi);
    setInput('');
    setAwaiting(true);

    try {
      const data = await callAssess(nextApi);
      logAssessResponse('turn /api/assess response', data);

      const assistantText = data.text ?? '';
      const result =
        data.result ?? parseStructuredResultFromText(assistantText);
      if (result && !data.result) {
        console.log(
          '[Bearing assess] Parsed result from assistant text (client fallback)',
          result
        );
      }

      setApiMessages((prev) => [
        ...prev,
        { role: 'assistant', content: assistantText }
      ]);

      if (result) {
        await saveResultAndRedirect(result);
      }
    } catch (e) {
      setError(normalizeCaughtAssessError(e));
      setApiMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'user' && last.content === trimmed) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      setInput(trimmed);
    } finally {
      setAwaiting(false);
    }
  };

  let lastAssistantContent = '';
  for (let i = apiMessages.length - 1; i >= 0; i--) {
    const m = apiMessages[i];
    if (m?.role === 'assistant' && typeof m.content === 'string') {
      lastAssistantContent = m.content;
      break;
    }
  }
  const hasAssessmentClosingPhrase = lastAssistantContent.includes(
    ASSESSMENT_CLOSING_PHRASE
  );

  /** Only after Bearing's closing line from the system prompt (full assessment delivered). */
  const showGetMyAssessment =
    started && hasAssessmentClosingPhrase && (!awaiting || savingAssessment);

  const handleGetMyAssessment = async () => {
    if (!started || awaiting || apiMessages.length === 0) return;
    if (!hasAssessmentClosingPhrase) return;

    setError(null);
    setSavingAssessment(true);
    setAwaiting(true);

    try {
      const res = await fetch('/api/assessment/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages })
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        if (res.status >= 500) {
          throw new Error(ASSESS_AI_CAPACITY_MESSAGE);
        }
        throw new Error('Could not extract assessment results.');
      }
      if (!res.ok) {
        throw new Error(
          userFacingAssessError(
            res,
            data,
            'Could not extract assessment results. Please try again.'
          )
        );
      }

      const result = data?.result;
      if (!result || typeof result !== 'object') {
        throw new Error('Extraction returned no structured result.');
      }

      await saveResultAndRedirect(result);
    } catch (e) {
      setError(normalizeCaughtAssessError(e));
    } finally {
      setSavingAssessment(false);
      setAwaiting(false);
    }
  };

  const displayMessages = displayFromApiMessages(apiMessages);

  const primaryBtn = {
    padding: '12px 20px',
    backgroundColor: NAVY,
    color: '#ffffff',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: FONT_SANS,
    cursor: 'pointer'
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: BG,
        fontFamily: FONT_SANS,
        color: TEXT
      }}
    >
      <header
        style={{
          backgroundColor: NAVY,
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}
      >
        <div>
          <div style={{ color: '#ffffff', fontSize: 20, fontWeight: 700 }}>
            Bearing
          </div>
          <div style={{ color: 'rgba(255,255,255,0.88)', fontSize: 12, marginTop: 2 }}>
            Conversational assessment
          </div>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 16px 24px',
          maxWidth: 720,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
      >
        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: SURFACE,
              border:
                error === ASSESS_AI_CAPACITY_MESSAGE
                  ? '1px solid rgba(27, 58, 107, 0.22)'
                  : '1px solid rgba(217, 119, 6, 0.45)',
              color: error === ASSESS_AI_CAPACITY_MESSAGE ? NAVY : TEXT,
              padding: '14px 16px',
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 14,
              fontFamily: FONT_SANS,
              lineHeight: 1.55,
              textAlign: error === ASSESS_AI_CAPACITY_MESSAGE ? 'center' : 'left',
              maxWidth: error === ASSESS_AI_CAPACITY_MESSAGE ? 520 : undefined,
              marginLeft: error === ASSESS_AI_CAPACITY_MESSAGE ? 'auto' : undefined,
              marginRight: error === ASSESS_AI_CAPACITY_MESSAGE ? 'auto' : undefined
            }}
          >
            {error}
          </div>
        )}

        {displayMessages.map((m, idx) => {
          const isUser = m.role === 'user';
          const show =
            m.role === 'assistant' ? stripAssessmentTags(m.content) : m.content;
          if (!show && m.role === 'assistant') return null;

          return (
            <div
              key={`${idx}-${isUser ? 'u' : 'a'}`}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                marginBottom: 12
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '12px 16px',
                  borderRadius: 14,
                  backgroundColor: isUser ? USER_TINT : SURFACE,
                  color: TEXT,
                  fontSize: 15,
                  lineHeight: 1.5,
                  boxShadow: isUser
                    ? 'none'
                    : '0 1px 3px rgba(26,25,22,0.08)',
                  borderLeft: isUser ? 'none' : `4px solid ${NAVY}`,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {show}
              </div>
            </div>
          );
        })}

        {awaiting && !savingAssessment && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              marginBottom: 12
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 14,
                backgroundColor: SURFACE,
                color: NAVY,
                fontSize: 14,
                borderLeft: `4px solid ${NAVY}`,
                boxShadow: '0 1px 3px rgba(26,25,22,0.08)'
              }}
            >
              <span style={{ color: MUTED }}>Bearing is typing…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div
        style={{
          padding: '12px 16px 20px',
          backgroundColor: BG,
          borderTop: '1px solid rgba(26, 25, 22, 0.08)',
          maxWidth: 720,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
          flexShrink: 0
        }}
      >
        {showGetMyAssessment && (
          <button
            type="button"
            onClick={handleGetMyAssessment}
            disabled={awaiting}
            style={{
              width: '100%',
              marginBottom: 12,
              ...primaryBtn,
              padding: '14px 18px',
              cursor: awaiting ? 'not-allowed' : 'pointer',
              opacity: awaiting ? 0.55 : 1
            }}
          >
            {savingAssessment ? 'Saving your results…' : 'Get My Assessment'}
          </button>
        )}

        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end'
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your answer…"
            disabled={awaiting || !started}
            rows={2}
            style={{
              flex: 1,
              resize: 'none',
              padding: '12px 14px',
              borderRadius: 12,
              border: `1px solid rgba(27, 58, 107, 0.22)`,
              fontSize: 15,
              fontFamily: FONT_SANS,
              color: TEXT,
              backgroundColor: SURFACE,
              outline: 'none',
              boxSizing: 'border-box',
              minHeight: 48,
              maxHeight: 120
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={awaiting || !started || !input.trim()}
            style={{
              ...primaryBtn,
              alignSelf: 'stretch',
              cursor:
                awaiting || !started || !input.trim()
                  ? 'not-allowed'
                  : 'pointer',
              opacity: awaiting || !started || !input.trim() ? 0.55 : 1
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
