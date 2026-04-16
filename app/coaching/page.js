'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const WARM_WHITE = '#faf9f6';
const NAVY = '#1B3A6B';
const MUTED = '#6B6A66';
const TEXT = '#1a1916';
const AMBER = '#D97706';
const TEAL = '#0A5F63';
const WHITE = '#ffffff';
const MUTED_ON_NAVY = 'rgba(255,255,255,0.72)';

const FONT_SANS = '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';
const FONT_DISPLAY = '"Playfair Display", Georgia, serif';
const FONT_MONO = '"IBM Plex Mono", ui-monospace, monospace';

const PROGRAM_OPTIONS = [
  { value: 'From Stuck to Named', label: 'From Stuck to Named' },
  { value: 'From Exposed to Elevated', label: 'From Exposed to Elevated' },
  { value: 'Not sure yet', label: 'Not sure yet' }
];

const labelCapsAmber = {
  fontSize: 11,
  fontFamily: FONT_SANS,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 600,
  color: AMBER,
  margin: '0 0 12px'
};

const labelCapsTealOnNavy = {
  fontSize: 11,
  fontFamily: FONT_SANS,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 600,
  color: TEAL,
  margin: '0 0 12px'
};

export default function CoachingPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [program, setProgram] = useState(PROGRAM_OPTIONS[0].value);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
    []
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      setErrorMessage('Please enter your name and email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setStatus('submitting');
    try {
      const { error } = await supabase.from('coaching_waitlist').insert({
        name: trimmedName,
        email: trimmedEmail,
        program
      });
      if (error) throw error;
      setStatus('success');
    } catch (err) {
      setStatus('idle');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: WHITE, fontFamily: FONT_SANS, color: TEXT }}>
      <header
        style={{
          backgroundColor: WARM_WHITE,
          padding: '56px 24px 48px',
          textAlign: 'center'
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 36,
              fontWeight: 700,
              color: NAVY,
              margin: '0 0 16px',
              lineHeight: 1.15
            }}
          >
            Coaching Programs
          </h1>
          <p
            style={{
              fontFamily: FONT_SANS,
              fontSize: 16,
              lineHeight: 1.55,
              color: MUTED,
              margin: 0
            }}
          >
            Built on what the assessment found. Not generic coaching — every session is calibrated to your specific
            capability profile.
          </p>
        </div>
      </header>

      <main style={{ padding: '24px 20px 64px', maxWidth: 1000, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: 24,
            marginBottom: 48
          }}
        >
          <article
            style={{
              backgroundColor: WHITE,
              border: `1px solid rgba(27, 58, 107, 0.12)`,
              borderLeft: `4px solid ${AMBER}`,
              borderRadius: '0 12px 12px 0',
              padding: '28px 24px 32px',
              boxShadow: '0 1px 4px rgba(26,25,22,0.08)'
            }}
          >
            <p style={labelCapsAmber}>FOR TRANSITION ADVISED</p>
            <h2
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 26,
                fontWeight: 600,
                color: NAVY,
                margin: '0 0 8px',
                lineHeight: 1.2
              }}
            >
              From Stuck to Named
            </h2>
            <p style={{ fontFamily: FONT_MONO, fontSize: 14, color: MUTED, margin: '0 0 12px' }}>6 weeks</p>
            <p style={{ fontFamily: FONT_MONO, fontSize: 24, fontWeight: 700, color: NAVY, margin: '0 0 16px' }}>
              $297
            </p>
            <p style={{ fontFamily: FONT_SANS, fontSize: 14, lineHeight: 1.55, color: TEXT, margin: '0 0 20px' }}>
              The assessment found what you bring. This program builds the language and evidence you need to make it
              visible to the people who should see it. You leave with a Capability Statement in your own voice, three
              specific professional examples that demonstrate it, and a visibility plan.
            </p>
            <p
              style={{
                fontFamily: FONT_SANS,
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: NAVY,
                margin: '0 0 10px'
              }}
            >
              What you get
            </p>
            <ul
              style={{
                fontFamily: FONT_SANS,
                fontSize: 14,
                lineHeight: 1.6,
                color: TEXT,
                margin: 0,
                paddingLeft: 20
              }}
            >
              <li>Weekly structured sessions calibrated to your assessment</li>
              <li>Capability Statement in your own voice</li>
              <li>Professional Visibility plan</li>
              <li>Named next step for your specific situation</li>
            </ul>
          </article>

          <article
            style={{
              backgroundColor: NAVY,
              borderRadius: 12,
              padding: '28px 24px 32px',
              boxShadow: '0 4px 24px rgba(27, 58, 107, 0.2)'
            }}
          >
            <p style={labelCapsTealOnNavy}>FOR EXPOSED</p>
            <h2
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 26,
                fontWeight: 600,
                color: WHITE,
                margin: '0 0 8px',
                lineHeight: 1.2
              }}
            >
              From Exposed to Elevated
            </h2>
            <p style={{ fontFamily: FONT_MONO, fontSize: 14, color: MUTED_ON_NAVY, margin: '0 0 12px' }}>90 days</p>
            <p style={{ fontFamily: FONT_MONO, fontSize: 24, fontWeight: 700, color: WHITE, margin: '0 0 16px' }}>
              $697
            </p>
            <p style={{ fontFamily: FONT_SANS, fontSize: 14, lineHeight: 1.55, color: WHITE, margin: '0 0 20px' }}>
              Four phases built on what the assessment found. Ends with a new assessment and a new certificate — so you
              have a before and after. Not generic career coaching. Specific to your capability profile.
            </p>
            <p
              style={{
                fontFamily: FONT_SANS,
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: MUTED_ON_NAVY,
                margin: '0 0 10px'
              }}
            >
              What you get
            </p>
            <ul
              style={{
                fontFamily: FONT_SANS,
                fontSize: 14,
                lineHeight: 1.6,
                color: WHITE,
                margin: 0,
                paddingLeft: 20
              }}
            >
              <li>Phase 1: Capability Discovery (weeks 1-3)</li>
              <li>Phase 2: Identity Claiming (weeks 4-6)</li>
              <li>Phase 3: Deliberate Practice (weeks 7-9)</li>
              <li>Phase 4: Reassessment + New Certificate (weeks 10-12)</li>
            </ul>
          </article>
        </div>

        <section style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 22,
              fontWeight: 600,
              color: NAVY,
              margin: '0 0 8px'
            }}
          >
            Join the waitlist
          </h2>
          <p style={{ fontFamily: FONT_SANS, fontSize: 14, color: MUTED, margin: '0 0 24px', lineHeight: 1.5 }}>
            Programs open soon. Add your name and we will be in touch.
          </p>

          {status === 'success' ? (
            <p
              role="status"
              style={{
                fontFamily: FONT_SANS,
                fontSize: 16,
                color: TEAL,
                fontWeight: 600,
                lineHeight: 1.55,
                margin: 0,
                padding: '20px 16px',
                backgroundColor: WARM_WHITE,
                borderRadius: 10,
                border: `1px solid rgba(10, 95, 99, 0.25)`
              }}
            >
              You are on the list. We will be in touch when your program opens.
            </p>
          ) : (
            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
              <label htmlFor="coaching-waitlist-name" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>
                Name
              </label>
              <input
                id="coaching-waitlist-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                disabled={status === 'submitting'}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 14px',
                  fontFamily: FONT_SANS,
                  fontSize: 15,
                  border: `1px solid ${NAVY}`,
                  borderRadius: 8,
                  marginBottom: 16,
                  color: TEXT
                }}
              />

              <label htmlFor="coaching-waitlist-email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>
                Email
              </label>
              <input
                id="coaching-waitlist-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={status === 'submitting'}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 14px',
                  fontFamily: FONT_SANS,
                  fontSize: 15,
                  border: `1px solid ${NAVY}`,
                  borderRadius: 8,
                  marginBottom: 16,
                  color: TEXT
                }}
              />

              <label htmlFor="coaching-waitlist-program" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>
                Which program
              </label>
              <select
                id="coaching-waitlist-program"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                disabled={status === 'submitting'}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 14px',
                  fontFamily: FONT_SANS,
                  fontSize: 15,
                  border: `1px solid ${NAVY}`,
                  borderRadius: 8,
                  marginBottom: 20,
                  color: TEXT,
                  backgroundColor: WHITE
                }}
              >
                {PROGRAM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {errorMessage ? (
                <p style={{ color: AMBER, fontSize: 14, margin: '0 0 16px' }}>{errorMessage}</p>
              ) : null}

              <button
                type="submit"
                disabled={status === 'submitting'}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  backgroundColor: status === 'submitting' ? MUTED : TEAL,
                  color: WHITE,
                  border: 'none',
                  borderRadius: 8,
                  fontFamily: FONT_SANS,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: status === 'submitting' ? 'not-allowed' : 'pointer'
                }}
              >
                {status === 'submitting' ? 'Joining…' : 'Join Waitlist'}
              </button>
            </form>
          )}
        </section>

        <p style={{ textAlign: 'center', marginTop: 40, marginBottom: 0 }}>
          <Link href="/" style={{ color: TEAL, fontSize: 14, fontWeight: 600 }}>
            Back to Bearing
          </Link>
        </p>
      </main>
    </div>
  );
}
