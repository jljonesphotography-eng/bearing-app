'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const COLORS = {
  navy: '#1B3A6B',
  sky: '#93c5fd',
  bg: '#f0f4f8',
  text: '#111827',
  muted: '#6b7280',
  card: '#ffffff',
  gold: '#F5B800'
};

function roundScore(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Math.round(value);
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState(null);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    return createClient(url, anonKey);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (!supabase) {
          throw new Error(
            'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
          );
        }

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        const user = userData?.user;
        if (!user) {
          router.push('/login');
          return;
        }

        const { data, error: scoreError } = await supabase
          .from('assessment_submissions')
          .select('total_score, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (scoreError) throw scoreError;

        const latest = Array.isArray(data) && data.length > 0 ? data[0] : null;
        const nextScore = latest ? roundScore(latest.total_score) : null;

        if (!cancelled) setScore(nextScore);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load dashboard.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const handleSignOut = async () => {
    try {
      if (supabase) await supabase.auth.signOut();
    } finally {
      router.push('/login');
    }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID
        })
      });

      const data = await res.json().catch(() => ({}));
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      throw new Error('Checkout session did not return a redirect URL.');
    } catch (e) {
      console.error('Upgrade error:', e);
      setError(e instanceof Error ? e.message : 'Upgrade failed.');
      setUpgrading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: COLORS.bg,
        color: COLORS.text,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"'
      }}
    >
      <header
        style={{
          backgroundColor: COLORS.navy,
          padding: '18px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ color: 'white', fontSize: 22, fontWeight: 800, letterSpacing: 0.2 }}>
            Bearing
          </div>
          <div style={{ color: COLORS.sky, fontSize: 13 }}>Human Capital Intelligence</div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          style={{
            backgroundColor: 'transparent',
            border: `1px solid ${COLORS.sky}`,
            color: COLORS.sky,
            padding: '9px 14px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600
          }}
        >
          Sign Out
        </button>
      </header>

      <main style={{ padding: '36px 28px', maxWidth: 980, margin: '0 auto' }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ color: COLORS.navy, fontSize: 22, fontWeight: 800 }}>Dashboard</div>
          <div style={{ color: COLORS.muted, marginTop: 6, fontSize: 14 }}>
            Organizational Capability Overview
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: '#fff7ed',
              border: '1px solid #fed7aa',
              color: '#9a3412',
              padding: '12px 14px',
              borderRadius: 10,
              marginBottom: 18,
              fontSize: 14
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ color: COLORS.muted, fontSize: 14 }}>Loading your results…</div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(240px, 1fr) minmax(320px, 2fr)',
                gap: 18,
                alignItems: 'stretch'
              }}
            >
              <section
                style={{
                  backgroundColor: COLORS.navy,
                  borderRadius: 14,
                  padding: 28,
                  textAlign: 'center'
                }}
              >
                <div style={{ color: COLORS.sky, fontSize: 13, fontWeight: 700 }}>
                  Overall Score
                </div>
                <div
                  style={{
                    marginTop: 10,
                    color: 'white',
                    fontSize: 64,
                    fontWeight: 900,
                    lineHeight: 1
                  }}
                >
                  {score === null ? '--' : `${score}%`}
                </div>
                <div style={{ marginTop: 14, color: COLORS.sky, fontSize: 13 }}>
                  From your latest assessment submission
                </div>
              </section>

              <section
                style={{
                  backgroundColor: COLORS.card,
                  borderRadius: 14,
                  padding: 26,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.06)'
                }}
              >
                <div style={{ color: COLORS.navy, fontSize: 16, fontWeight: 800 }}>
                  Next Steps
                </div>

                <div style={{ marginTop: 14, color: '#374151', fontSize: 14, lineHeight: 1.55 }}>
                  Review the{' '}
                  <Link
                    href="/dashboard/report"
                    style={{
                      color: COLORS.navy,
                      fontWeight: 700,
                      textDecoration: 'underline'
                    }}
                  >
                    Reporting View
                  </Link>{' '}
                  for a full category breakdown.
                </div>

                <div style={{ marginTop: 10, color: '#374151', fontSize: 14, lineHeight: 1.55 }}>
                  Schedule a follow-up with your leadership team
                </div>
              </section>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
              <button
                type="button"
                onClick={() => router.push('/assessment')}
                style={{
                  padding: '12px 18px',
                  backgroundColor: 'white',
                  color: COLORS.navy,
                  border: `2px solid ${COLORS.navy}`,
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Retake Assessment
              </button>

              <button
                type="button"
                onClick={handleUpgrade}
                disabled={upgrading}
                style={{
                  padding: '12px 18px',
                  backgroundColor: upgrading ? '#d1d5db' : COLORS.gold,
                  color: COLORS.navy,
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: upgrading ? 'not-allowed' : 'pointer'
                }}
              >
                {upgrading ? 'Redirecting…' : 'Upgrade to Bearing Pro'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}