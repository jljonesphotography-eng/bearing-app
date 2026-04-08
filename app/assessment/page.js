'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const NAVY = '#1B3A6B';
const SKY = '#93c5fd';
const GOLD = '#F5B800';
const BG = '#f0f4f8';

/** Must match server default in app/api/assess/route.js when messages is [] */
const START_USER_MESSAGE =
  'Please begin the Bearing conversational assessment.';

function stripAssessmentTags(text) {
  if (!text) return '';
  return text
    .replace(/<assessment_result>[\s\S]*?<\/assessment_result>/gi, '')
    .trim();
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

export default function AssessmentPage() {
  const router = useRouter();
  const bottomRef = useRef(null);
  const [apiMessages, setApiMessages] = useState([]);
  const [awaiting, setAwaiting] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);

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
    async (messagesPayload) => {
      const res = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesPayload })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Assessment request failed.');
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

      const row = {
        user_id: user.id,
        total_score: Number.isFinite(totalScore) ? totalScore : null,
        verdict: result.verdict ?? null,
        primary_finding: result.primary_finding ?? null,
        zone: result.zone ?? null,
        action_1: result.action_1 ?? null,
        action_2: result.action_2 ?? null,
        action_3: result.action_3 ?? null,
        energy_profile: result.energy_profile ?? null,
        status: 'completed'
      };

      const { error: insertError } = await supabase
        .from('assessment_submissions')
        .insert([row]);

      if (insertError) throw insertError;
      router.push('/dashboard');
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

        const assistantText = data.text ?? '';
        setApiMessages([
          { role: 'user', content: START_USER_MESSAGE },
          { role: 'assistant', content: assistantText }
        ]);
        setStarted(true);

        if (data.result) {
          await saveResultAndRedirect(data.result);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Something went wrong.');
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
      const assistantText = data.text ?? '';
      setApiMessages((prev) => [
        ...prev,
        { role: 'assistant', content: assistantText }
      ]);

      if (data.result) {
        await saveResultAndRedirect(data.result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setAwaiting(false);
    }
  };

  const displayMessages = displayFromApiMessages(apiMessages);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: BG,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
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
          <div style={{ color: 'white', fontSize: 20, fontWeight: 800 }}>
            Bearing
          </div>
          <div style={{ color: SKY, fontSize: 12, marginTop: 2 }}>
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
              backgroundColor: '#fff7ed',
              border: '1px solid #fed7aa',
              color: '#9a3412',
              padding: '12px 14px',
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 14
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
                  backgroundColor: '#ffffff',
                  color: '#111827',
                  fontSize: 15,
                  lineHeight: 1.5,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {show}
              </div>
            </div>
          );
        })}

        {awaiting && (
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
                backgroundColor: '#ffffff',
                color: NAVY,
                fontSize: 14,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
              }}
            >
              <span style={{ opacity: 0.7 }}>Bearing is typing…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div
        style={{
          padding: '12px 16px 20px',
          backgroundColor: BG,
          borderTop: '1px solid #e5e7eb',
          maxWidth: 720,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
          flexShrink: 0
        }}
      >
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
              border: '1px solid #d1d5db',
              fontSize: 15,
              fontFamily: 'inherit',
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
              padding: '12px 20px',
              backgroundColor: GOLD,
              color: NAVY,
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 800,
              cursor:
                awaiting || !started || !input.trim()
                  ? 'not-allowed'
                  : 'pointer',
              opacity: awaiting || !started || !input.trim() ? 0.55 : 1,
              alignSelf: 'stretch'
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
