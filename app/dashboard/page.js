'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function DashboardPage() {
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function getScore() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase
        .from('assessment_submissions')
        .select('total_score')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setScore(Math.round(data[0].total_score));
      }
      setLoading(false);
    }
    getScore();
  }, []);

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
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (error) {
      console.error('Upgrade error:', error);
      setUpgrading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Strong';
    if (score >= 60) return 'Developing';
    return 'Needs Attention';
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f0f4f8',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#1B3A6B',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: '700' }}>
            Bearing
          </h1>
          <p style={{ color: '#93c5fd', margin: 0, fontSize: '13px' }}>
            Human Capital Intelligence
          </p>
        </div>
        <button
          onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
          style={{
            backgroundColor: 'transparent',
            border: '1px solid #93c5fd',
            color: '#93c5fd',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          Sign Out
        </button>
      </div>

      {/* Main Content */}
      <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ color: '#1B3A6B', fontSize: '22px', marginBottom: '8px' }}>
          Bearing Dashboard
        </h2>
        <p style={{ color: '#666', marginBottom: '32px', fontSize: '15px' }}>
          Organizational Capability Overview
        </p>

        {loading ? (
          <p style={{ color: '#666' }}>Loading your results...</p>
        ) : (
          <>
            {/* Score + Next Steps Row */}
            <div style={{
              display: 'flex',
              gap: '24px',
              marginBottom: '24px',
              flexWrap: 'wrap'
            }}>
              {/* Score Card */}
              <div style={{
                backgroundColor: '#1B3A6B',
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center',
                minWidth: '220px',
                flex: '1'
              }}>
                <p style={{ color: '#93c5fd', margin: '0 0 8px 0', fontSize: '14px' }}>
                  Overall Score
                </p>
                <p style={{
                  color: 'white',
                  fontSize: '64px',
                  fontWeight: '700',
                  margin: '0 0 8px 0',
                  lineHeight: '1'
                }}>
                  {score !== null ? `${score}%` : '--'}
                </p>
                {score !== null && (
                  <span style={{
                    backgroundColor: getScoreColor(score),
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    {getScoreLabel(score)}
                  </span>
                )}
                <p style={{ color: '#93c5fd', margin: '16px 0 0 0', fontSize: '13px' }}>
                  Based on your last assessment
                </p>
              </div>

              {/* Next Steps Card */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '32px',
                flex: '2',
                minWidth: '280px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}>
                <h3 style={{ color: '#1B3A6B', marginTop: 0, fontSize: '17px' }}>
                  Next Steps
                </h3>
                {score !== null && score < 80 && (
                  <p style={{ color: '#444', marginBottom: '12px', fontSize: '14px' }}>
                    ⚠️ Focus on capability gaps identified in your assessment.
                  </p>
                )}
                <p style={{ color: '#444', marginBottom: '12px', fontSize: '14px' }}>
                  Review the{' '}
                  <a
                    href="/dashboard/report"
                    style={{ color: '#1B3A6B', fontWeight: '600', textDecoration: 'underline' }}
                  >
                    Reporting View
                  </a>
                  {' '}for a full category breakdown.
                </p>
                <p style={{ color: '#444', fontSize: '14px' }}>
                  Schedule a follow-up with your leadership team to address priority gaps.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button
                onClick={() => router.push('/assessment')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'white',
                  color: '#1B3A6B',
                  border: '2px solid #1B3A6B',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Retake Assessment
              </button>

              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: upgrading ? '#aaa' : '#F5B800',
                  color: '#1B3A6B',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: upgrading ? 'not-allowed' : 'pointer'
                }}
              >
                {upgrading ? 'Redirecting...' : '⭐ Upgrade to Bearing Pro'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}