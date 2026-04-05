'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function FullReportPage() {
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getReportData() {
      // Fetching the last 3 responses to calculate the current average
      const { data } = await supabase.from('responses').select('answer_value').limit(3);
      if (data && data.length > 0) {
        const total = data.reduce((acc, curr) => acc + curr.answer_value, 0);
        setScore((total / 15) * 100);
      }
      setLoading(false);
    }
    getReportData();
  }, []);

  const handleUpgrade = async () => {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: 'price_1TIusD4hZvzU4tlplZYY6WAJ' }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Loading Detailed Report...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px', fontFamily: 'sans-serif' }}>
      
      {/* 🌟 THE UPGRADE BANNER (TOP OF PAGE) 🌟 */}
      <div style={{ 
        backgroundColor: '#FFD700', 
        padding: '30px', 
        borderRadius: '15px', 
        textAlign: 'center', 
        marginBottom: '40px',
        border: '2px solid #1B3A6B'
      }}>
        <h2 style={{ color: '#1B3A6B', marginTop: 0 }}>Unlock Your Full Capability Audit</h2>
        <p style={{ color: '#1B3A6B', fontWeight: 'bold' }}>Upgrade to see category breakdowns for Strategy, Operations, and Culture.</p>
        
        <button 
          onClick={handleUpgrade}
          style={{ 
            backgroundColor: '#1B3A6B', 
            color: 'white',
            padding: '15px 40px', 
            fontSize: '18px', 
            fontWeight: 'bold', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          UPGRADE TO PRO
        </button>
      </div>

      {/* REPORT CONTENT */}
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ color: '#1B3A6B' }}>Organizational Capability Report</h1>
        <hr style={{ border: '1px solid #eee' }} />
      </header>

      <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8fafc', borderRadius: '15px' }}>
        <h3 style={{ color: '#64748b' }}>Overall Maturity Score</h3>
        <div style={{ fontSize: '72px', fontWeight: '900', color: '#1B3A6B' }}>
          {score ? `${score.toFixed(0)}%` : '--'}
        </div>
      </div>

      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <button 
          onClick={() => window.location.href = '/dashboard'}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}