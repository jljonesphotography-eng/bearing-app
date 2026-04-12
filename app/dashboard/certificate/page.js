'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const WHITE = '#FFFFFF';
const NAVY = '#1B3A6B';
const MUTED = '#6b6860';
const TEXT = '#1a1916';
const WARM_WHITE = '#faf9f6';
const TEAL_CERT = '#0A5F63';
const AMBER = '#D97706';

const FONT_SANS = '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';
const FONT_DISPLAY = '"Playfair Display", Georgia, serif';

function smallCapsSans(sizePx, weight = 600) {
  return {
    fontFamily: FONT_SANS,
    fontSize: sizePx,
    fontWeight: weight,
    fontVariant: 'small-caps',
    letterSpacing: '0.08em'
  };
}

function normalizeVerdict(verdict) {
  return String(verdict || '')
    .toUpperCase()
    .replace(/\s+/g, '_');
}

function verdictAccentColor(verdict) {
  const v = normalizeVerdict(verdict);
  if (v === 'WELL_POSITIONED') return TEAL_CERT;
  if (v === 'TRANSITION_ADVISED') return AMBER;
  return NAVY;
}

function certificateVerdictTitle(verdict) {
  const v = normalizeVerdict(verdict);
  if (v === 'WELL_POSITIONED') return 'WELL-POSITIONED';
  if (v === 'TRANSITION_ADVISED') return 'TRANSITION ADVISED';
  return 'BUILDING TOWARD';
}

function formatAssessmentDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function issuedToLine(user) {
  if (!user) return 'Participant';
  const meta = user.user_metadata || {};
  const name = [meta.full_name, meta.name, meta.display_name].find(
    (n) => typeof n === 'string' && n.trim() !== ''
  );
  if (name) return name.trim();
  if (user.email) return user.email;
  return 'Participant';
}

export default function CertificatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [error, setError] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const u = auth?.user;
      if (!u) {
        router.push('/login');
        return;
      }
      setUser(u);

      const { data, error: qErr } = await supabase
        .from('assessment_submissions')
        .select('verdict, primary_finding, created_at')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (qErr) throw qErr;
      const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
      setSubmission(row);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load certificate.');
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const handleShare = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      setLinkCopied(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const accent = verdictAccentColor(submission?.verdict);
  const verdictTitle = certificateVerdictTitle(submission?.verdict);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: WHITE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT_SANS,
          color: MUTED
        }}
      >
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: WHITE,
          padding: 40,
          fontFamily: FONT_SANS,
          color: TEXT,
          textAlign: 'center',
          maxWidth: 520,
          margin: '0 auto'
        }}
      >
        <p style={{ marginBottom: 20 }}>{error}</p>
        <Link href="/dashboard/report" style={{ color: TEAL_CERT, fontWeight: 600 }}>
          Back to report
        </Link>
      </div>
    );
  }

  if (!submission) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: WHITE,
          padding: 40,
          fontFamily: FONT_SANS,
          color: TEXT,
          textAlign: 'center',
          maxWidth: 520,
          margin: '0 auto'
        }}
      >
        <p style={{ marginBottom: 20 }}>No assessment found yet.</p>
        <Link href="/assessment" style={{ color: TEAL_CERT, fontWeight: 600 }}>
          Take the assessment
        </Link>
      </div>
    );
  }

  const primaryFinding = String(submission.primary_finding || '—').trim();

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: WHITE,
        padding: '40px 20px 56px',
        fontFamily: FONT_SANS,
        color: TEXT
      }}
    >
      <div
        style={{
          maxWidth: 680,
          margin: '0 auto',
          border: `2px solid ${NAVY}`,
          boxSizing: 'border-box',
          padding: '40px 36px 44px',
          backgroundColor: WHITE
        }}
      >
        <p
          style={{
            ...smallCapsSans(11),
            color: MUTED,
            textAlign: 'center',
            margin: '0 0 8px'
          }}
        >
          GROUNDWORK — HUMAN CAPABILITY INTELLIGENCE
        </p>
        <p
          style={{
            ...smallCapsSans(10),
            color: MUTED,
            textAlign: 'center',
            margin: '0 0 20px'
          }}
        >
          CAPABILITY ASSESSMENT CERTIFICATE
        </p>

        <div
          style={{
            height: 2,
            backgroundColor: accent,
            width: '100%',
            margin: '0 0 24px'
          }}
        />

        <h1
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 36,
            fontWeight: 700,
            color: accent,
            textAlign: 'center',
            margin: '0 0 20px',
            lineHeight: 1.15
          }}
        >
          {verdictTitle}
        </h1>

        <p
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 22,
            fontWeight: 600,
            color: NAVY,
            textAlign: 'center',
            margin: '0 0 12px',
            lineHeight: 1.35
          }}
        >
          Issued to {issuedToLine(user)}
        </p>

        <p
          style={{
            fontFamily: FONT_SANS,
            fontSize: 13,
            color: MUTED,
            textAlign: 'center',
            margin: '0 0 24px'
          }}
        >
          {formatAssessmentDate(submission.created_at)}
        </p>

        <div
          style={{
            height: 2,
            backgroundColor: accent,
            width: '100%',
            margin: '0 0 28px'
          }}
        />

        <p
          style={{
            ...smallCapsSans(10),
            color: MUTED,
            textAlign: 'center',
            margin: '0 0 10px'
          }}
        >
          CAPABILITY FINDING
        </p>
        <div
          style={{
            border: `2px solid ${NAVY}`,
            backgroundColor: WARM_WHITE,
            padding: 16,
            marginBottom: 28
          }}
        >
          <p
            style={{
              fontFamily: FONT_SANS,
              fontSize: 14,
              lineHeight: 1.55,
              color: TEXT,
              margin: 0
            }}
          >
            {primaryFinding}
          </p>
        </div>

        <p
          style={{
            fontFamily: FONT_SANS,
            fontSize: 11,
            fontStyle: 'italic',
            color: MUTED,
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: 560,
            margin: '0 auto 32px'
          }}
        >
          This assessment is based on behavioral observation, not self-report. It reflects capabilities
          demonstrated in a structured conversation with Human Capability Intelligence. The AI landscape is
          evolving — this is a positioning snapshot, not a permanent verdict.
        </p>

        <p
          style={{
            ...smallCapsSans(10),
            color: TEAL_CERT,
            textAlign: 'center',
            margin: 0
          }}
        >
          Issued by Groundwork — Human Capability Intelligence
        </p>
      </div>

      <div
        className="certificate-hide-print"
        style={{
          maxWidth: 680,
          margin: '28px auto 0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'center'
        }}
      >
        <button
          type="button"
          onClick={handleShare}
          style={{
            flex: '1 1 160px',
            maxWidth: 280,
            padding: '14px 24px',
            backgroundColor: TEAL_CERT,
            color: '#ffffff',
            border: 'none',
            borderRadius: 10,
            fontFamily: FONT_SANS,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Share
        </button>
        <button
          type="button"
          onClick={handlePrint}
          style={{
            flex: '1 1 160px',
            maxWidth: 280,
            padding: '14px 24px',
            backgroundColor: NAVY,
            color: '#ffffff',
            border: 'none',
            borderRadius: 10,
            fontFamily: FONT_SANS,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Download / Print
        </button>
      </div>
      {linkCopied && (
        <p
          className="certificate-hide-print"
          style={{
            textAlign: 'center',
            fontFamily: FONT_SANS,
            fontSize: 13,
            color: MUTED,
            marginTop: 12,
            marginBottom: 0
          }}
        >
          Link copied
        </p>
      )}

      <p className="certificate-hide-print" style={{ textAlign: 'center', marginTop: 24 }}>
        <Link href="/dashboard/report" style={{ color: TEAL_CERT, fontSize: 14, fontWeight: 600 }}>
          Back to report
        </Link>
      </p>
    </div>
  );
}
