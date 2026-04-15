'use client';

import BearingThinkingOverlay from '@/app/components/BearingThinkingOverlay';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const COLORS = {
  navy: '#1B3A6B',
  bg: '#faf9f6',
  text: '#1a1916',
  muted: '#6B6A66',
  surface: '#ffffff',
  teal: '#0A5F63',
  amber: '#D97706'
};

const FONT_SANS =
  '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';
const FONT_DISPLAY = '"Playfair Display", Georgia, serif';
const FONT_MONO = '"IBM Plex Mono", ui-monospace, monospace';

function verdictDisplay(verdict) {
  const v = String(verdict || '').toUpperCase().replace(/\s+/g, '_');
  if (v === 'WELL_POSITIONED') return { label: 'Well Positioned', color: COLORS.teal };
  if (v === 'TRANSITION_ADVISED')
    return { label: 'Transition Advised', color: COLORS.amber };
  if (v === 'EXPOSED') return { label: 'Exposed', color: COLORS.navy };
  return {
    label: verdict ? String(verdict).replace(/_/g, ' ') : '—',
    color: COLORS.muted
  };
}

function formatEnergyProfile(value) {
  if (value == null || value === '') return null;
  return String(value).replace(/_/g, ' ');
}

function roundScore(value) {
  if (value === null || value === undefined) return null;
  const num =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseFloat(value)
        : NaN;
  if (!Number.isFinite(num)) return null;
  return Math.round(num);
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
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
          .select(
            'total_score, capability_score, verdict, primary_finding, zone, action_1, action_2, action_3, energy_profile, created_at'
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (scoreError) throw scoreError;

        const latest = Array.isArray(data) && data.length > 0 ? data[0] : null;
        if (!cancelled) {
          setSubmission(
            latest
              ? {
                  total_score: roundScore(latest.total_score),
                  capability_score: roundScore(latest.capability_score),
                  verdict: latest.verdict ?? null,
                  primary_finding: latest.primary_finding ?? null,
                  zone: latest.zone ?? null,
                  action_1: latest.action_1 ?? null,
                  action_2: latest.action_2 ?? null,
                  action_3: latest.action_3 ?? null,
                  energy_profile: latest.energy_profile ?? null
                }
              : null
          );
        }
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

  const checkoutSyncDone = useRef(false);

  useEffect(() => {
    if (!supabase || loading || checkoutSyncDone.current) return;

    async function syncStripeReturn() {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');
      if (!sessionId) return;

      const okReturn =
        params.get('checkout_success') === '1' || params.get('success') === 'true';
      if (!okReturn) return;

      checkoutSyncDone.current = true;

      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        const user = userData?.user;
        if (!user) return;

        const res = await fetch('/api/stripe/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, userId: user.id })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.verified) {
          await supabase.auth.refreshSession();
          const url = new URL(window.location.href);
          url.searchParams.delete('session_id');
          url.searchParams.delete('checkout_success');
          url.searchParams.delete('success');
          window.history.replaceState({}, '', url.pathname + (url.search || ''));
        } else {
          checkoutSyncDone.current = false;
          console.error('Checkout confirm failed:', data?.error || res.status);
        }
      } catch (e) {
        checkoutSyncDone.current = false;
        console.error('Checkout sync error:', e);
      }
    }

    syncStripeReturn();
  }, [supabase, loading]);

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
      if (!supabase) throw new Error('Supabase is not configured.');
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const user = userData?.user;
      if (!user) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
          userId: user.id
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

  const score = submission?.total_score ?? null;
  const verdictStyle = verdictDisplay(submission?.verdict);
  const actions = [submission?.action_1, submission?.action_2, submission?.action_3].filter(
    (a) => a != null && String(a).trim() !== ''
  );
  const energyLabel = formatEnergyProfile(submission?.energy_profile);
  const hasPrimary =
    submission?.primary_finding != null &&
    String(submission.primary_finding).trim() !== '';

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: COLORS.bg,
        color: COLORS.text,
        fontFamily: FONT_SANS
      }}
    >
      {loading ? <BearingThinkingOverlay /> : null}
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
          <div style={{ color: '#ffffff', fontSize: 22, fontWeight: 700, letterSpacing: 0.02 }}>
            Bearing
          </div>
          <div style={{ color: 'rgba(255,255,255,0.88)', fontSize: 13 }}>
            Human Capability Intelligence
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid rgba(255,255,255,0.65)',
            color: '#ffffff',
            padding: '9px 14px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONT_SANS
          }}
        >
          Sign Out
        </button>
      </header>

      <main style={{ padding: '36px 28px', maxWidth: 980, margin: '0 auto' }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ color: COLORS.navy, fontSize: 22, fontWeight: 700 }}>Dashboard</div>
          <div style={{ color: COLORS.muted, marginTop: 6, fontSize: 14 }}>
            Organizational Capability Overview
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: COLORS.surface,
              border: `1px solid ${COLORS.amber}`,
              color: COLORS.text,
              padding: '12px 14px',
              borderRadius: 10,
              marginBottom: 18,
              fontSize: 14
            }}
          >
            {error}
          </div>
        )}

        {loading ? null : (
          <>
            {hasPrimary && (
              <section
                style={{
                  backgroundColor: COLORS.surface,
                  border: `1px solid ${COLORS.navy}`,
                  borderRadius: 14,
                  padding: '24px 28px',
                  marginBottom: 20,
                  boxShadow: '0 1px 4px rgba(26,25,22,0.06)'
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 22,
                    lineHeight: 1.45,
                    color: COLORS.text,
                    fontWeight: 500
                  }}
                >
                  {String(submission.primary_finding).trim()}
                </div>
              </section>
            )}

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
                  backgroundColor: COLORS.surface,
                  borderRadius: 14,
                  padding: 28,
                  textAlign: 'center',
                  border: `1px solid rgba(27, 58, 107, 0.12)`,
                  boxShadow: '0 1px 4px rgba(26,25,22,0.06)'
                }}
              >
                {submission?.verdict != null && String(submission.verdict).trim() !== '' && (
                  <div
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: 30,
                      fontWeight: 600,
                      lineHeight: 1.2,
                      color: verdictStyle.color,
                      marginBottom: 18
                    }}
                  >
                    {verdictStyle.label}
                  </div>
                )}

                <div style={{ color: COLORS.muted, fontSize: 12, fontWeight: 600, letterSpacing: 0.04, textTransform: 'uppercase' }}>
                  Overall score
                </div>
                <div
                  style={{
                    marginTop: 8,
                    color: COLORS.text,
                    fontSize: 56,
                    fontWeight: 600,
                    lineHeight: 1,
                    fontFamily: FONT_MONO
                  }}
                >
                  {score === null ? '--' : `${score}%`}
                </div>

                <div style={{ marginTop: 16, color: COLORS.muted, fontSize: 13 }}>
                  From your latest assessment submission
                </div>
              </section>

              <section
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 14,
                  padding: 26,
                  border: `1px solid rgba(27, 58, 107, 0.12)`,
                  boxShadow: '0 1px 4px rgba(26,25,22,0.06)'
                }}
              >
                <div style={{ color: COLORS.navy, fontSize: 16, fontWeight: 700 }}>
                  Next Steps
                </div>

                {(submission?.zone != null && String(submission.zone).trim() !== '') ||
                energyLabel ? (
                  <div
                    style={{
                      marginTop: 10,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px 16px',
                      fontSize: 13,
                      color: COLORS.muted
                    }}
                  >
                    {submission?.zone != null && String(submission.zone).trim() !== '' && (
                      <span>
                        <strong style={{ color: COLORS.text }}>Zone:</strong>{' '}
                        {String(submission.zone).trim()}
                      </span>
                    )}
                    {energyLabel ? (
                      <span>
                        <strong style={{ color: COLORS.text }}>Energy:</strong> {energyLabel}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {actions.length > 0 && (
                  <ol
                    style={{
                      margin: '16px 0 0 0',
                      paddingLeft: 22,
                      color: COLORS.text,
                      fontSize: 14,
                      lineHeight: 1.65
                    }}
                  >
                    {actions.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: 8 }}>
                        {String(item).trim()}
                      </li>
                    ))}
                  </ol>
                )}

                <Link
                  href="/dashboard/report"
                  style={{
                    display: 'block',
                    width: '100%',
                    boxSizing: 'border-box',
                    marginTop: 18,
                    padding: '12px 18px',
                    backgroundColor: COLORS.navy,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: FONT_SANS,
                    textAlign: 'center',
                    textDecoration: 'none'
                  }}
                >
                  View Full Report
                </Link>

              </section>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
              <button
                type="button"
                onClick={() => router.push('/assessment')}
                style={{
                  padding: '12px 18px',
                  backgroundColor: COLORS.surface,
                  color: COLORS.navy,
                  border: `2px solid ${COLORS.navy}`,
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: FONT_SANS
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
                  backgroundColor: upgrading ? COLORS.muted : COLORS.navy,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: upgrading ? 'not-allowed' : 'pointer',
                  fontFamily: FONT_SANS
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
