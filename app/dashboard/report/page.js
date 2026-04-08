'use client';

import { useState } from 'react';

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
    <div style={{
      maxWidth: '800px',
      margin: '60px auto',
      padding: '40px',
      fontFamily: 'sans-serif'
    }}>

      {/* Header */}
      <h1 style={{ color: '#1B3A6B', fontSize: '32px', marginBottom: '8px' }}>
        Capability Report
      </h1>
      <p style={{ color: '#666', fontSize: '16px', marginBottom: '40px' }}>
        Unlock your full organizational intelligence report
      </p>

      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: '#fff7ed',
            border: '1px solid #fed7aa',
            color: '#9a3412',
            padding: '12px 14px',
            borderRadius: '12px',
            marginBottom: '18px'
          }}
        >
          {error}
        </div>
      )}

      {/* Upgrade Card */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '16px',
        padding: '48px 40px',
        textAlign: 'center',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
      }}>
        <h2 style={{ color: '#1B3A6B', fontSize: '24px', marginBottom: '16px' }}>
          Your full report is ready
        </h2>
        <p style={{ color: '#666', fontSize: '15px', marginBottom: '32px', lineHeight: '1.6' }}>
          Upgrade to Pro to access your detailed capability breakdown,
          gap analysis, and recommended next steps.
        </p>
        <button
          onClick={handleUpgrade}
          disabled={upgrading}
          style={{
            backgroundColor: '#1B3A6B',
            color: '#FFD700',
            padding: '16px 48px',
            fontSize: '18px',
            fontWeight: 'bold',
            borderRadius: '10px',
            cursor: upgrading ? 'not-allowed' : 'pointer',
            border: 'none',
            boxShadow: '0 4px 14px rgba(27,58,107,0.3)'
          }}
        >
          {upgrading ? 'Redirecting…' : 'Upgrade to Pro'}
        </button>
      </div>

    </div>
  );
}