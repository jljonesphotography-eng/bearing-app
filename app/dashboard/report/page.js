'use client';

import { useState } from 'react';

const BG = '#faf9f6';
const TEXT = '#1a1916';
const MUTED = '#6B6A66';
const NAVY = '#1B3A6B';
const SURFACE = '#ffffff';
const FONT_SANS =
  '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';

export default function ReportPage() {
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpgrade = async () => {
    setError(null);
    setUpgrading(true);

    try {
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
      if (!priceId) {
        throw new Error('Missing NEXT_PUBLIC_STRIPE_PRICE_ID.');
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || 'Checkout request failed.');
      }

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

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: BG,
        fontFamily: FONT_SANS,
        color: TEXT
      }}
    >
      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: 40
        }}
      >
        <h1 style={{ color: NAVY, fontSize: 32, marginBottom: 8, fontWeight: 700 }}>
          Capability Report
        </h1>
        <p style={{ color: MUTED, fontSize: 16, marginBottom: 40 }}>
          Unlock your full organizational intelligence report
        </p>

        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: SURFACE,
              border: '1px solid rgba(217, 119, 6, 0.45)',
              color: TEXT,
              padding: '12px 14px',
              borderRadius: 12,
              marginBottom: 18
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            backgroundColor: SURFACE,
            border: `1px solid rgba(27, 58, 107, 0.12)`,
            borderRadius: 16,
            padding: '48px 40px',
            textAlign: 'center',
            boxShadow: '0 1px 4px rgba(26,25,22,0.06)'
          }}
        >
          <h2 style={{ color: NAVY, fontSize: 24, marginBottom: 16, fontWeight: 700 }}>
            Your full report is ready
          </h2>
          <p
            style={{
              color: MUTED,
              fontSize: 15,
              marginBottom: 32,
              lineHeight: 1.6
            }}
          >
            Upgrade to Pro to access your detailed capability breakdown, gap analysis, and
            recommended next steps.
          </p>
          <button
            onClick={handleUpgrade}
            disabled={upgrading}
            style={{
              backgroundColor: NAVY,
              color: '#ffffff',
              padding: '16px 48px',
              fontSize: 18,
              fontWeight: 600,
              borderRadius: 10,
              cursor: upgrading ? 'not-allowed' : 'pointer',
              border: 'none',
              boxShadow: '0 4px 14px rgba(27,58,107,0.25)',
              fontFamily: FONT_SANS,
              opacity: upgrading ? 0.65 : 1
            }}
          >
            {upgrading ? 'Redirecting…' : 'Upgrade to Pro'}
          </button>
        </div>
      </div>
    </div>
  );
}
