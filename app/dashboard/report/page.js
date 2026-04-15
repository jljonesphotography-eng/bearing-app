'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const DEEP_DARK = '#0a0a12';
const WARM_WHITE = '#faf9f6';
const TEXT = '#1a1916';
const MUTED = '#6B6A66';
const LABEL_MUTED = '#6b6860';
const NAVY = '#1B3A6B';
const GROUNDWORK_TEAL = '#0A5F63';
const TEAL = '#0D7377';
const AMBER = '#D97706';
const SURFACE = '#ffffff';
const ZONE_MUTED = '#d4d1c8';
const DOT_NAVY_MUTED = '#5c6b7a';
const ACTION_LINE_MUTED = '#6B7280';
const ACTION_LINE_WARM = '#92400E';
const ACTION_LINE_RULE = '#E5E7EB';

const FONT_SANS = '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';
const FONT_DISPLAY = '"Playfair Display", Georgia, serif';
const FONT_MONO = '"IBM Plex Mono", ui-monospace, monospace';

const ZONE_SEGMENTS = [
  { n: 1, label: 'ZONE 1 — WELL-POSITIONED' },
  { n: 2, label: 'ZONE 2 — BUILDING' },
  { n: 3, label: 'ZONE 3 — WATCH' },
  { n: 4, label: 'ZONE 4 — TRANSITION' }
];

const DIMENSION_FALLBACK =
  'Complete a new assessment to see your dimension breakdown.';

const DIMENSIONS = [
  { name: 'JUDGMENT DEPTH', dot: TEAL, field: 'dim_judgment' },
  { name: 'RELATIONAL INTELLIGENCE', dot: TEAL, field: 'dim_relational' },
  { name: 'SYNTHESIS CAPACITY', dot: AMBER, field: 'dim_synthesis' },
  { name: 'CREATIVE ORIGINALITY', dot: DOT_NAVY_MUTED, field: 'dim_creative' },
  { name: 'ADAPTIVE EXECUTION', dot: DOT_NAVY_MUTED, field: 'dim_adaptive' }
];

function dimensionFindingText(submission, field) {
  const raw = submission?.[field];
  const s = raw == null ? '' : String(raw).trim();
  return s === '' ? DIMENSION_FALLBACK : s;
}

function verdictColor(verdict) {
  const v = String(verdict || '')
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (v === 'WELL_POSITIONED') return TEAL;
  if (v === 'TRANSITION_ADVISED') return AMBER;
  if (v === 'EXPOSED') return NAVY;
  return MUTED;
}

function normalizeVerdict(verdict) {
  return String(verdict || '')
    .toUpperCase()
    .replace(/\s+/g, '_');
}

function verdictDisplayWord(verdict) {
  const v = normalizeVerdict(verdict);
  if (v === 'WELL_POSITIONED') return 'WELL-POSITIONED';
  if (v === 'TRANSITION_ADVISED') return 'TRANSITION ADVISED';
  if (v === 'EXPOSED') return 'EXPOSED';
  return verdict ? String(verdict).replace(/_/g, '-') : '—';
}

/** Report hero and full-report headline — maps the lowest band to BUILDING TOWARD. */
function reportVerdictHeadline(verdict) {
  const v = normalizeVerdict(verdict);
  if (v === 'EXPOSED') return 'BUILDING TOWARD';
  return verdictDisplayWord(verdict);
}

function parseZoneNumber(zone) {
  const m = String(zone || '').match(/[1-4]/);
  return m ? parseInt(m[0], 10) : null;
}

function formatEnergy(s) {
  if (s == null || s === '') return '—';
  return String(s).replace(/_/g, ' ');
}

/** Matches extraction format: four lines WHAT — / WHY NOW — / THIS WEEK — / WHAT CHANGES — */
function parseStructuredActionItem(raw) {
  const s = raw == null ? '' : String(raw).trim();
  if (!s) return null;
  const lines = s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const parts = {
    what: null,
    whyNow: null,
    thisWeek: null,
    whatChanges: null
  };
  const splitAfterLabel = (line, label) => {
    const upper = line.toUpperCase();
    const labelUpper = label.toUpperCase();
    if (!upper.startsWith(labelUpper)) return null;
    const rest = line.slice(label.length).trim();
    // Prefer long dash, then colon, then standard/en dash.
    const separators = ['—', ':', '-', '–'];
    let value = null;
    for (const sep of separators) {
      if (!rest.includes(sep)) continue;
      const split = rest.split(sep);
      if (split.length < 2) continue;
      value = split.slice(1).join(sep).trim();
      if (value) break;
    }
    if (!value && /^[—:–-]\s*/.test(rest)) {
      value = rest.replace(/^[—:–-]\s*/, '').trim();
    }
    return value || null;
  };
  for (const line of lines) {
    if (!line) continue;
    const what = splitAfterLabel(line, 'WHAT');
    if (what) {
      parts.what = what;
      continue;
    }
    const whyNow = splitAfterLabel(line, 'WHY NOW');
    if (whyNow) {
      parts.whyNow = whyNow;
      continue;
    }
    const thisWeek = splitAfterLabel(line, 'THIS WEEK');
    if (thisWeek) {
      parts.thisWeek = thisWeek;
      continue;
    }
    const whatChanges = splitAfterLabel(line, 'WHAT CHANGES');
    if (whatChanges) {
      parts.whatChanges = whatChanges;
      continue;
    }
  }
  if (parts.what && parts.whyNow && parts.thisWeek && parts.whatChanges) {
    return parts;
  }
  // Last-resort fallback: split into 4 roughly equal segments so structured UI stays populated.
  const compact = s.replace(/\s+/g, ' ').trim();
  if (!compact) return null;
  const tokens = compact.split(' ').filter(Boolean);
  if (tokens.length === 0) return null;
  const chunkSize = Math.ceil(tokens.length / 4);
  const segs = [];
  for (let i = 0; i < 4; i++) {
    const start = i * chunkSize;
    const end = Math.min(tokens.length, (i + 1) * chunkSize);
    const seg = tokens.slice(start, end).join(' ').trim();
    segs.push(seg);
  }
  const fallback = {
    what: segs[0] || compact,
    whyNow: segs[1] || segs[0] || compact,
    thisWeek: segs[2] || segs[1] || segs[0] || compact,
    whatChanges: segs[3] || segs[2] || segs[1] || segs[0] || compact
  };
  return fallback;
}

const actionMapRowLabel = {
  fontSize: 10,
  fontFamily: FONT_SANS,
  fontVariant: 'small-caps',
  letterSpacing: '0.1em',
  fontWeight: 600,
  color: GROUNDWORK_TEAL
};

function hasFullReportAccess(user) {
  if (process.env.NEXT_PUBLIC_REPORT_GATE_BYPASS === 'true') return true;
  return user?.user_metadata?.bearing_report_unlocked === true;
}

function labelStyle() {
  return {
    fontSize: 11,
    fontFamily: FONT_SANS,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    fontWeight: 600,
    color: LABEL_MUTED,
    marginBottom: 10
  };
}

/** 240° arc from ~7 o'clock to ~5 o'clock (CCW through top); viewBox 200×160 */
const GAUGE_VIEW_W = 200;
const GAUGE_VIEW_H = 160;
const GAUGE_CX = 100;
const GAUGE_CY = 118;
const GAUGE_R = 71;

function capabilityArcPathD() {
  const t1 = (150 * Math.PI) / 180;
  const t2 = (30 * Math.PI) / 180;
  const sx = GAUGE_CX + GAUGE_R * Math.cos(t1);
  const sy = GAUGE_CY - GAUGE_R * Math.sin(t1);
  const ex = GAUGE_CX + GAUGE_R * Math.cos(t2);
  const ey = GAUGE_CY - GAUGE_R * Math.sin(t2);
  return `M ${sx} ${sy} A ${GAUGE_R} ${GAUGE_R} 0 1 1 ${ex} ${ey}`;
}

function CapabilityConfidenceGauge({ vc }) {
  const fillRef = useRef(null);
  const animatedRef = useRef(false);
  const pathD = useMemo(() => capabilityArcPathD(), []);

  useLayoutEffect(() => {
    const path = fillRef.current;
    if (!path || animatedRef.current) return;
    animatedRef.current = true;
    const len = path.getTotalLength();
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        path.style.transition = 'stroke-dashoffset 1.2s ease-out';
        path.style.strokeDashoffset = String(len * (1 - 0.78));
      });
    });
  }, []);

  const arcTop = GAUGE_CY - GAUGE_R;
  const arcChordY = GAUGE_CY - GAUGE_R * Math.sin((150 * Math.PI) / 180);
  const pctCenterY = (arcTop + arcChordY) / 2;

  return (
    <div
      style={{
        width: 200,
        maxWidth: '100%',
        margin: '0 auto'
      }}
    >
      <svg
        width={GAUGE_VIEW_W}
        height={GAUGE_VIEW_H}
        viewBox={`0 0 ${GAUGE_VIEW_W} ${GAUGE_VIEW_H}`}
        style={{ display: 'block', overflow: 'visible' }}
        aria-hidden
      >
        <path
          d={pathD}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={10}
          strokeLinecap="round"
        />
        <path
          ref={fillRef}
          d={pathD}
          fill="none"
          stroke={vc}
          strokeWidth={10}
          strokeLinecap="round"
        />
        <text
          x={GAUGE_CX}
          y={pctCenterY}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontFamily: FONT_MONO,
            fontSize: 28,
            fill: '#ffffff'
          }}
        >
          78%
        </text>
      </svg>
      <p
        style={{
          fontFamily: FONT_SANS,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.6)',
          margin: '8px 0 0',
          textAlign: 'center',
          lineHeight: 1.3
        }}
      >
        CAPABILITY CONFIDENCE
      </p>
    </div>
  );
}

function Section1VerdictFull({ submission, vc }) {
  return (
    <section
      style={{
        backgroundColor: DEEP_DARK,
        padding: '56px 24px 64px',
        textAlign: 'center'
      }}
    >
      <h1
        className="bearing-report-verdict-word"
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 48,
          fontWeight: 700,
          color: vc,
          margin: '0 0 24px',
          lineHeight: 1.1
        }}
      >
        {reportVerdictHeadline(submission.verdict)}
      </h1>
      {submission.primary_finding ? (
        <p
          className="bearing-report-verdict-sentence"
          style={{
            fontFamily: FONT_SANS,
            fontSize: 17,
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.88)',
            maxWidth: 560,
            margin: '0 auto'
          }}
        >
          {String(submission.primary_finding).trim()}
        </p>
      ) : null}

      <div
        style={{
          maxWidth: 560,
          width: '100%',
          margin: '32px auto 40px',
          textAlign: 'center'
        }}
      >
        <CapabilityConfidenceGauge vc={vc} />
      </div>
    </section>
  );
}

const labelTealCaps = {
  fontSize: 11,
  fontFamily: FONT_SANS,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 600,
  color: TEAL,
  marginBottom: 12
};

function AiCollaborationGuideSection({ verdict, primary_finding, zone, energy_profile }) {
  const [phase, setPhase] = useState('loading');
  const [guide, setGuide] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setPhase('loading');
      setGuide(null);
      try {
        const res = await fetch('/api/ai-collaboration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verdict,
            primary_finding,
            zone,
            energy_profile
          })
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setPhase('error');
          return;
        }
        if (
          data &&
          typeof data.domain_shift === 'string' &&
          Array.isArray(data.amplification_methods) &&
          data.amplification_methods.length === 3 &&
          typeof data.next_skill === 'string'
        ) {
          setGuide(data);
          setPhase('ready');
        } else {
          setPhase('error');
        }
      } catch {
        if (!cancelled) setPhase('error');
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [verdict, primary_finding, zone, energy_profile]);

  return (
    <div style={{ marginBottom: 48 }}>
      <p style={{ ...labelStyle(), marginBottom: phase === 'loading' ? 8 : 12 }}>AI COLLABORATION GUIDE</p>

      {phase === 'loading' && (
        <p style={{ fontFamily: FONT_SANS, fontSize: 14, color: MUTED, margin: '0 0 24px' }}>
          Generating your guide…
        </p>
      )}

      {phase === 'error' && (
        <p style={{ fontFamily: FONT_SANS, fontSize: 14, color: MUTED, margin: '0 0 24px', lineHeight: 1.55 }}>
          Your AI collaboration guide will appear here. Refresh to try again.
        </p>
      )}

      {phase === 'ready' && guide && (
        <>
          <p style={labelTealCaps}>WHERE AI IS MOVING IN YOUR DOMAIN</p>
          <div
            style={{
              backgroundColor: WARM_WHITE,
              borderLeft: `4px solid ${NAVY}`,
              borderRadius: '0 10px 10px 0',
              padding: '20px 24px',
              marginBottom: 32,
              boxShadow: '0 1px 3px rgba(26,25,22,0.06)'
            }}
          >
            <p style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT, margin: 0, lineHeight: 1.55 }}>
              {guide.domain_shift}
            </p>
          </div>

          <p style={{ ...labelTealCaps, marginBottom: 16 }}>HOW TO USE AI TO AMPLIFY YOUR CAPABILITY</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              marginBottom: 32
            }}
          >
            {guide.amplification_methods.map((method, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: WARM_WHITE,
                  border: `1px solid ${NAVY}`,
                  borderRadius: 12,
                  padding: '20px 18px'
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: FONT_SANS,
                    letterSpacing: '0.12em',
                    fontWeight: 700,
                    color: TEAL,
                    marginBottom: 12
                  }}
                >
                  METHOD {i + 1}
                </div>
                <p style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT, margin: 0, lineHeight: 1.5 }}>
                  {method}
                </p>
              </div>
            ))}
          </div>

          <p style={{ ...labelTealCaps, marginBottom: 12 }}>BUILD THIS NEXT — 30 DAYS</p>
          <div
            style={{
              borderLeft: `4px solid ${TEAL}`,
              backgroundColor: WARM_WHITE,
              padding: '20px 24px',
              borderRadius: '0 10px 10px 0',
              boxShadow: '0 1px 3px rgba(26,25,22,0.06)'
            }}
          >
            <p
              style={{
                fontFamily: FONT_SANS,
                fontSize: 16,
                fontWeight: 700,
                color: TEXT,
                margin: 0,
                lineHeight: 1.55
              }}
            >
              {guide.next_skill}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

const labelWatchListAmber = {
  fontSize: 11,
  fontFamily: FONT_SANS,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 600,
  color: AMBER,
  marginBottom: 8
};

const labelGroundworkTealCaps = {
  fontSize: 11,
  fontFamily: FONT_SANS,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 600,
  color: GROUNDWORK_TEAL,
  marginBottom: 12
};

const TEAL_TINT_BG = 'rgba(10, 95, 99, 0.08)';
const AMBER_TINT_BG = 'rgba(217, 119, 6, 0.1)';

function profileGeneratingLine() {
  return (
    <p style={{ fontFamily: FONT_SANS, fontSize: 14, color: MUTED, margin: '0 0 24px' }}>Generating your profile...</p>
  );
}

function ExposedAcknowledgmentSection({ primary_finding, zone }) {
  const [phase, setPhase] = useState('loading');
  const [ack, setAck] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setPhase('loading');
      setAck(null);
      try {
        const res = await fetch('/api/report/exposed-acknowledgment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ primary_finding, zone })
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setPhase('error');
          return;
        }
        if (data && typeof data.acknowledgment === 'string' && data.acknowledgment.trim()) {
          setAck(data.acknowledgment.trim());
          setPhase('ready');
        } else {
          setPhase('error');
        }
      } catch {
        if (!cancelled) setPhase('error');
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [primary_finding, zone]);

  return (
    <div style={{ marginBottom: 48 }}>
      <p style={{ ...labelStyle(), marginBottom: phase === 'loading' ? 8 : 12 }}>ACKNOWLEDGMENT</p>
      {phase === 'loading' && profileGeneratingLine()}
      {phase === 'error' && (
        <p style={{ fontFamily: FONT_SANS, fontSize: 14, color: MUTED, margin: '0 0 24px', lineHeight: 1.55 }}>
          This section will appear here. Refresh to try again.
        </p>
      )}
      {phase === 'ready' && ack && (
        <div
          style={{
            backgroundColor: '#faf9f6',
            borderLeft: `4px solid ${GROUNDWORK_TEAL}`,
            borderRadius: '0 10px 10px 0',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(26,25,22,0.06)'
          }}
        >
          <p style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT, margin: 0, lineHeight: 1.55 }}>{ack}</p>
        </div>
      )}
    </div>
  );
}

function WatchListSection({ primary_finding, zone }) {
  const [phase, setPhase] = useState('loading');
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setPhase('loading');
      setItems(null);
      try {
        const res = await fetch('/api/report/watch-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ primary_finding, zone })
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setPhase('error');
          return;
        }
        if (
          data &&
          typeof data.watch_1 === 'string' &&
          typeof data.watch_2 === 'string' &&
          data.watch_1.trim() &&
          data.watch_2.trim()
        ) {
          setItems({ watch_1: data.watch_1.trim(), watch_2: data.watch_2.trim() });
          setPhase('ready');
        } else {
          setPhase('error');
        }
      } catch {
        if (!cancelled) setPhase('error');
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [primary_finding, zone]);

  return (
    <div style={{ marginBottom: 48 }}>
      <p style={{ ...labelWatchListAmber, marginBottom: phase === 'loading' ? 8 : 12 }}>WATCH LIST</p>
      {phase === 'loading' && profileGeneratingLine()}
      {phase === 'error' && (
        <p style={{ fontFamily: FONT_SANS, fontSize: 14, color: MUTED, margin: '0 0 24px', lineHeight: 1.55 }}>
          Your watch list will appear here. Refresh to try again.
        </p>
      )}
      {phase === 'ready' && items && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16
          }}
        >
          {[items.watch_1, items.watch_2].map((text, i) => (
            <div
              key={i}
              style={{
                border: `1px solid ${AMBER}`,
                borderLeft: `4px solid ${AMBER}`,
                backgroundColor: SURFACE,
                borderRadius: 12,
                padding: '20px 18px'
              }}
            >
              <p style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT, margin: 0, lineHeight: 1.55 }}>{text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TransitionAdvisedSections({ verdict, primary_finding, zone }) {
  const [phase, setPhase] = useState('loading');
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setPhase('loading');
      setData(null);
      try {
        const res = await fetch('/api/report/transition-breakdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verdict, primary_finding, zone })
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setPhase('error');
          return;
        }
        if (
          json &&
          typeof json.strong_1 === 'string' &&
          typeof json.strong_2 === 'string' &&
          typeof json.build_1 === 'string' &&
          typeof json.build_2 === 'string'
        ) {
          setData({
            strong_1: json.strong_1.trim(),
            strong_2: json.strong_2.trim(),
            build_1: json.build_1.trim(),
            build_2: json.build_2.trim()
          });
          setPhase('ready');
        } else {
          setPhase('error');
        }
      } catch {
        if (!cancelled) setPhase('error');
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [verdict, primary_finding, zone]);

  return (
    <div style={{ marginBottom: 48 }}>
      {phase === 'loading' && (
        <>
          <p style={{ ...labelGroundworkTealCaps, marginBottom: 8 }}>WHAT IS STRONG</p>
          {profileGeneratingLine()}
        </>
      )}
      {phase === 'error' && (
        <>
          <p style={labelGroundworkTealCaps}>WHAT IS STRONG</p>
          <p style={{ fontFamily: FONT_SANS, fontSize: 14, color: MUTED, margin: '0 0 24px', lineHeight: 1.55 }}>
            This breakdown will appear here. Refresh to try again.
          </p>
        </>
      )}
      {phase === 'ready' && data && (
        <>
          <p style={labelGroundworkTealCaps}>WHAT IS STRONG</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
              marginBottom: 32
            }}
          >
            {[data.strong_1, data.strong_2].map((text, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: TEAL_TINT_BG,
                  borderLeft: `4px solid ${GROUNDWORK_TEAL}`,
                  borderRadius: '0 10px 10px 0',
                  padding: '20px 18px'
                }}
              >
                <p style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT, margin: 0, lineHeight: 1.55 }}>{text}</p>
              </div>
            ))}
          </div>

          <p style={{ ...labelWatchListAmber, marginBottom: 12 }}>WHERE TO BUILD</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16
            }}
          >
            {[data.build_1, data.build_2].map((text, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: AMBER_TINT_BG,
                  borderLeft: `4px solid ${AMBER}`,
                  borderRadius: '0 10px 10px 0',
                  padding: '20px 18px'
                }}
              >
                <p style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT, margin: 0, lineHeight: 1.55 }}>{text}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const labelNextStepAmber = {
  fontSize: 11,
  fontFamily: FONT_SANS,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 600,
  color: AMBER,
  margin: '0 0 12px'
};

const labelNextStepTealOnNavy = {
  fontSize: 11,
  fontFamily: FONT_SANS,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 600,
  color: GROUNDWORK_TEAL,
  margin: '0 0 12px'
};

function CoachingOfferCard({ variant }) {
  if (variant === 'transition') {
    return (
      <section
        style={{
          backgroundColor: '#faf9f6',
          borderLeft: `4px solid ${AMBER}`,
          borderRadius: '0 12px 12px 0',
          padding: 24,
          marginBottom: 48,
          maxWidth: 880,
          boxShadow: '0 1px 3px rgba(26,25,22,0.06)'
        }}
      >
        <p style={labelNextStepAmber}>NEXT STEP</p>
        <h2
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 22,
            fontWeight: 600,
            color: NAVY,
            margin: '0 0 12px',
            lineHeight: 1.25
          }}
        >
          From Stuck to Named
        </h2>
        <p style={{ fontFamily: FONT_SANS, fontSize: 14, color: TEXT, margin: '0 0 16px', lineHeight: 1.55 }}>
          A 6-week program that takes what the assessment found and builds the language and evidence you need to make it
          visible to the people who should see it.
        </p>
        <p
          style={{
            fontFamily: FONT_MONO,
            fontSize: 20,
            fontWeight: 700,
            color: NAVY,
            margin: '0 0 20px'
          }}
        >
          $297
        </p>
        <Link
          href="/coaching"
          style={{
            display: 'inline-block',
            backgroundColor: AMBER,
            color: '#ffffff',
            fontFamily: FONT_SANS,
            fontSize: 15,
            fontWeight: 600,
            padding: '12px 24px',
            borderRadius: 8,
            textDecoration: 'none'
          }}
        >
          Learn More
        </Link>
      </section>
    );
  }

  if (variant === 'exposed') {
    return (
      <section
        style={{
          backgroundColor: NAVY,
          borderRadius: 12,
          padding: 24,
          marginBottom: 48,
          maxWidth: 880,
          boxShadow: '0 4px 24px rgba(27, 58, 107, 0.2)'
        }}
      >
        <p style={labelNextStepTealOnNavy}>NEXT STEP</p>
        <h2
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 22,
            fontWeight: 600,
            color: '#ffffff',
            margin: '0 0 12px',
            lineHeight: 1.25
          }}
        >
          From Exposed to Elevated
        </h2>
        <p style={{ fontFamily: FONT_SANS, fontSize: 14, color: '#ffffff', margin: '0 0 16px', lineHeight: 1.55 }}>
          A 90-day program built on what the assessment found. Takes your capability profile as the foundation for three
          months of structured work — ending with a new assessment and a new certificate.
        </p>
        <p
          style={{
            fontFamily: FONT_MONO,
            fontSize: 20,
            fontWeight: 700,
            color: '#ffffff',
            margin: '0 0 20px'
          }}
        >
          $697
        </p>
        <Link
          href="/coaching"
          style={{
            display: 'inline-block',
            backgroundColor: GROUNDWORK_TEAL,
            color: '#ffffff',
            fontFamily: FONT_SANS,
            fontSize: 15,
            fontWeight: 600,
            padding: '12px 24px',
            borderRadius: 8,
            textDecoration: 'none'
          }}
        >
          Learn More
        </Link>
      </section>
    );
  }

  return null;
}

function ReportCertificatePromo() {
  return (
    <section
      style={{
        backgroundColor: NAVY,
        borderRadius: 14,
        padding: '36px 28px',
        textAlign: 'center',
        maxWidth: 880,
        margin: '0 auto'
      }}
    >
      <h2
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 20,
          fontWeight: 600,
          color: '#ffffff',
          margin: '0 0 12px'
        }}
      >
        Your Capability Certificate
      </h2>
      <p
        style={{
          fontFamily: FONT_SANS,
          fontSize: 14,
          color: 'rgba(255,255,255,0.9)',
          margin: '0 0 24px'
        }}
      >
        Share what the assessment found — as a professional record.
      </p>
      <Link
        href="/dashboard/certificate"
        style={{
          display: 'inline-block',
          backgroundColor: GROUNDWORK_TEAL,
          color: '#ffffff',
          padding: '12px 28px',
          borderRadius: 8,
          fontFamily: FONT_SANS,
          fontSize: 15,
          fontWeight: 600,
          textDecoration: 'none'
        }}
      >
        View Your Certificate
      </Link>
    </section>
  );
}

function ReportSections2Through7({ submission, zoneNum, showAiCollaborationGuide, includeCertificate = true }) {
  const verdictKey = normalizeVerdict(submission.verdict);
  const isExposed = verdictKey === 'EXPOSED';
  const isWellPositioned = verdictKey === 'WELL_POSITIONED';
  const isTransitionAdvised = verdictKey === 'TRANSITION_ADVISED';
  const primaryFindingLabel = isExposed ? 'BUILDING TOWARD' : 'CAPABILITY FINDING';
  const verdictAi = showAiCollaborationGuide;

  return (
    <div style={{ backgroundColor: WARM_WHITE, padding: '40px 20px 80px' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {verdictAi && isExposed ? (
          <ExposedAcknowledgmentSection primary_finding={submission.primary_finding} zone={submission.zone} />
        ) : null}

        <p style={{ ...labelStyle(), marginBottom: 12 }}>{primaryFindingLabel}</p>
        <div
          style={{
            border: `2px solid ${NAVY}`,
            backgroundColor: SURFACE,
            borderRadius: 12,
            padding: '24px 28px',
            marginBottom: 48
          }}
        >
          <p
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 20,
              lineHeight: 1.5,
              color: TEXT,
              margin: 0
            }}
          >
            {String(submission.primary_finding || '—').trim()}
          </p>
        </div>

        {verdictAi && isWellPositioned ? (
          <WatchListSection primary_finding={submission.primary_finding} zone={submission.zone} />
        ) : null}

        {verdictAi && isTransitionAdvised ? (
          <TransitionAdvisedSections
            verdict={submission.verdict}
            primary_finding={submission.primary_finding}
            zone={submission.zone}
          />
        ) : null}

        <p style={{ ...labelStyle(), marginBottom: 12 }}>CAPABILITY ZONE</p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            marginBottom: 48
          }}
        >
          {ZONE_SEGMENTS.map((z) => {
            const active = zoneNum === z.n;
            return (
              <div
                key={z.n}
                style={{
                  flex: '1 1 120px',
                  minHeight: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 8px',
                  backgroundColor: active ? TEAL : ZONE_MUTED,
                  color: active ? '#ffffff' : TEXT,
                  fontSize: 11,
                  fontFamily: FONT_SANS,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  borderRadius: 6
                }}
              >
                {z.label}
              </div>
            );
          })}
        </div>

        <p style={{ ...labelStyle(), marginBottom: 16 }}>DIMENSION BREAKDOWN</p>
        <div style={{ marginBottom: 48 }}>
          {DIMENSIONS.map((dim) => (
            <div
              key={dim.name}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '14px 0',
                borderBottom: '1px solid rgba(26,25,22,0.08)'
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: dim.dot,
                  marginTop: 4,
                  flexShrink: 0
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: FONT_SANS,
                    letterSpacing: '0.08em',
                    fontWeight: 600,
                    color: TEXT,
                    marginBottom: 6
                  }}
                >
                  {dim.name}
                </div>
                <div style={{ fontSize: 14, fontFamily: FONT_SANS, color: MUTED, lineHeight: 1.55 }}>
                  {dimensionFindingText(submission, dim.field)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ ...labelStyle(), marginBottom: 12 }}>ENGAGEMENT PROFILE</p>
        <div
          style={{
            borderLeft: `4px solid ${TEAL}`,
            backgroundColor: SURFACE,
            padding: '20px 24px',
            marginBottom: 48,
            borderRadius: '0 10px 10px 0',
            boxShadow: '0 1px 3px rgba(26,25,22,0.06)'
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontFamily: FONT_SANS,
              fontWeight: 700,
              color: TEXT,
              marginBottom: 10
            }}
          >
            {formatEnergy(submission.energy_profile)}
          </div>
          <p style={{ fontSize: 14, fontFamily: FONT_SANS, color: MUTED, margin: 0, lineHeight: 1.55 }}>
            Your action map reflects your capability and your energy for using it.
          </p>
        </div>

        <p style={{ ...labelStyle(), marginBottom: 16 }}>YOUR ACTION MAP</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            marginBottom: 48
          }}
        >
          {[submission.action_1, submission.action_2, submission.action_3].map((act, i) => {
            const trimmed = act ? String(act).trim() : '';
            const structured = trimmed ? parseStructuredActionItem(trimmed) : null;
            return (
              <div
                key={i}
                style={{
                  backgroundColor: WARM_WHITE,
                  border: `1px solid ${NAVY}`,
                  borderRadius: 12,
                  padding: '20px 18px',
                  minHeight: 140
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: FONT_SANS,
                    letterSpacing: '0.12em',
                    fontWeight: 700,
                    color: TEAL,
                    marginBottom: 12
                  }}
                >
                  ACTION {i + 1}
                </div>
                {structured ? (
                  <>
                    <p
                      style={{
                        fontSize: 14,
                        fontFamily: FONT_SANS,
                        color: TEXT,
                        margin: '0 0 14px',
                        lineHeight: 1.5
                      }}
                    >
                      {structured.what}
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        fontFamily: FONT_SANS,
                        color: ACTION_LINE_MUTED,
                        margin: '0 0 10px',
                        lineHeight: 1.55
                      }}
                    >
                      <span style={actionMapRowLabel}>WHY NOW</span>{' '}
                      {structured.whyNow}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        margin: '0 0 10px'
                      }}
                    >
                      <span
                        style={{
                          fontFamily: FONT_SANS,
                          fontSize: 13,
                          lineHeight: 1.55,
                          color: GROUNDWORK_TEAL,
                          flexShrink: 0,
                          marginTop: 1
                        }}
                        aria-hidden
                      >
                        ›
                      </span>
                      <p
                        style={{
                          fontSize: 13,
                          fontFamily: FONT_SANS,
                          color: ACTION_LINE_WARM,
                          margin: 0,
                          lineHeight: 1.55,
                          flex: 1
                        }}
                      >
                        <span style={actionMapRowLabel}>THIS WEEK</span>{' '}
                        {structured.thisWeek}
                      </p>
                    </div>
                    <div
                      style={{
                        borderTop: `1px solid ${ACTION_LINE_RULE}`,
                        marginTop: 4,
                        paddingTop: 12
                      }}
                    >
                      <p
                        style={{
                          fontSize: 13,
                          fontFamily: FONT_SANS,
                          color: ACTION_LINE_MUTED,
                          margin: 0,
                          lineHeight: 1.55,
                          fontStyle: 'italic'
                        }}
                      >
                        <span style={{ ...actionMapRowLabel, fontStyle: 'normal' }}>WHAT CHANGES</span>{' '}
                        <span style={{ fontStyle: 'italic' }}>{structured.whatChanges}</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p
                      style={{
                        fontSize: 14,
                        fontFamily: FONT_SANS,
                        color: TEXT,
                        margin: '0 0 12px',
                        lineHeight: 1.5
                      }}
                    >
                      {trimmed || '—'}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        fontFamily: FONT_SANS,
                        color: MUTED,
                        margin: 0,
                        fontStyle: 'italic'
                      }}
                    >
                      Start this week.
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {showAiCollaborationGuide ? (
          <AiCollaborationGuideSection
            verdict={submission.verdict}
            primary_finding={submission.primary_finding}
            zone={submission.zone}
            energy_profile={submission.energy_profile}
          />
        ) : null}

        {includeCertificate && isTransitionAdvised ? <CoachingOfferCard variant="transition" /> : null}
        {includeCertificate && isExposed ? <CoachingOfferCard variant="exposed" /> : null}

        {includeCertificate ? <ReportCertificatePromo /> : null}
      </div>
    </div>
  );
}

export default function ReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState(null);

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
    try {
      await supabase.auth.refreshSession().catch(() => {});
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
        .select(
          'verdict, primary_finding, zone, action_1, action_2, action_3, energy_profile, dim_judgment, dim_relational, dim_synthesis, dim_creative, dim_adaptive, dim_judgment_plain, dim_relational_plain, dim_synthesis_plain, dim_creative_plain, dim_adaptive_plain, created_at'
        )
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (qErr) throw qErr;
      const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
      setSubmission(row);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpgrade = async () => {
    setError(null);
    setUpgrading(true);
    try {
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
      if (!priceId) throw new Error('Missing NEXT_PUBLIC_STRIPE_PRICE_ID.');
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: user.id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Checkout request failed.');
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      throw new Error('Checkout session did not return a redirect URL.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upgrade failed.');
      setUpgrading(false);
    }
  };

  const unlocked = user && hasFullReportAccess(user);
  const vc = verdictColor(submission?.verdict);
  const zoneNum = parseZoneNumber(submission?.zone);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: WARM_WHITE,
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

  if (!submission) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: WARM_WHITE,
          padding: 40,
          fontFamily: FONT_SANS,
          color: TEXT,
          textAlign: 'center',
          maxWidth: 520,
          margin: '0 auto'
        }}
      >
        <p style={{ marginBottom: 20 }}>No assessment found yet.</p>
        <Link href="/assessment" style={{ color: TEAL, fontWeight: 600 }}>
          Take the assessment
        </Link>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: DEEP_DARK, fontFamily: FONT_SANS }}>
        <div style={{ padding: '48px 24px 40px', textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 48,
              fontWeight: 700,
              color: vc,
              margin: 0,
              lineHeight: 1.1
            }}
          >
            {reportVerdictHeadline(submission.verdict)}
          </h1>
        </div>

        <div style={{ position: 'relative', backgroundColor: WARM_WHITE, minHeight: '72vh' }}>
          <div
            style={{
              filter: 'blur(11px)',
              opacity: 0.88,
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          >
            <ReportSections2Through7
              submission={submission}
              zoneNum={zoneNum}
              showAiCollaborationGuide={false}
              includeCertificate={false}
            />
          </div>

          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '10%',
              display: 'flex',
              justifyContent: 'center',
              padding: '0 20px',
              pointerEvents: 'auto',
              zIndex: 2
            }}
          >
            <div
              style={{
                backgroundColor: SURFACE,
                border: `1px solid rgba(27, 58, 107, 0.2)`,
                borderRadius: 16,
                padding: '40px 32px',
                maxWidth: 420,
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 12px 40px rgba(10, 10, 18, 0.25)'
              }}
            >
              <h2 style={{ color: NAVY, fontSize: 22, fontWeight: 700, margin: '0 0 12px' }}>
                Unlock your full report
              </h2>
              <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.55, margin: '0 0 24px' }}>
                Complete checkout to see your full capability report, action map, and certificate options.
              </p>
              {error && <p style={{ color: AMBER, fontSize: 14, marginBottom: 16 }}>{error}</p>}
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={upgrading}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  backgroundColor: upgrading ? MUTED : NAVY,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: upgrading ? 'not-allowed' : 'pointer',
                  fontFamily: FONT_SANS
                }}
              >
                {upgrading ? 'Redirecting…' : 'Continue to checkout'}
              </button>
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              zIndex: 3,
              pointerEvents: 'auto',
              padding: '32px 20px 48px'
            }}
          >
            <ReportCertificatePromo />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: WARM_WHITE, fontFamily: FONT_SANS, color: TEXT }}>
      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: '#fff7ed',
            borderBottom: '1px solid rgba(217, 119, 6, 0.35)',
            color: TEXT,
            padding: '12px 20px',
            textAlign: 'center',
            fontSize: 14
          }}
        >
          {error}
        </div>
      )}
      <Section1VerdictFull submission={submission} vc={vc} />
      <ReportSections2Through7 submission={submission} zoneNum={zoneNum} showAiCollaborationGuide />
    </div>
  );
}
