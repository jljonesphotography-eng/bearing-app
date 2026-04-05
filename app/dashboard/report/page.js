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
      
      {/* 🚨 THIS IS THE NEW UPGRADE SECTION 🚨 */}
      <div style={{ backgroundColor: '#FFD700', padding: '30px', borderRadius: '15px', textAlign: 'center', marginBottom: '40px', border: '3px solid #1B3A6B' }}>
        <h2 style={{ color: '#1B3A6B', margin: '0 0 10px 0' }}>UPGRADE TO UNLOCK FULL REPORT</h2>
        <button 
          onClick={handleUpgrade}
          style={{ backgroundColor: '#1B3A6B', color: 'white', padding: '15px 40px', fontSize: '18px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}
        >
          UPGRADE TO PRO
        </button>
      </div>

      <h1 style={{ color: '#1B3A6B' }}>Detailed Capability Report</h1>
      <div style={{ padding: '40px', backgroundColor: '#f8fafc', borderRadius: '15px', textAlign: 'center' }}>
        <h3 style={{ color: '#64748b' }}>Current Score</h3>
        <div style={{ fontSize: '72px', fontWeight: '900', color: '#1B3A6B' }}>
          {score ? `${score.toFixed(0)}%` : '--'}
        </div>
      </div>
    </div>
  );
}