'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function DashboardPage() {
  const [score, setScore] = useState(null);

  useEffect(() => {
    async function getScore() {
      // Get the last 3 answers from your Supabase 'responses' table
      const { data } = await supabase.from('responses').select('answer_value').limit(3);
      if (data && data.length > 0) {
        const total = data.reduce((acc, curr) => acc + curr.answer_value, 0);
        // Calculate percentage (3 answers x max score of 5 = 15)
        setScore((total / 15) * 100);
      }
    }
    getScore();
  }, []);

  const handleUpgrade = async () => {
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: 'price_1TIusD4hZvzU4tlplZYY6WAJ' }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Check your Vercel Environment Variables - Stripe key might be missing.");
      }
    } catch (err) {
      console.error("Payment error:", err);
    }
  };

  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      
      {/* 🚨 THE UPGRADE BUTTON 🚨 */}
      <button 
        onClick={handleUpgrade}
        style={{ 
          backgroundColor: '#FFD700', 
          color: '#1B3A6B',
          padding: '20px 40px', 
          fontSize: '20px', 
          fontWeight: 'bold', 
          border: 'none', 
          borderRadius: '10px', 
          cursor: 'pointer',
          marginBottom: '40px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}
      >
        UPGRADE TO PRO (CLICK HERE)
      </button>

      <div style={{ borderTop: '2px solid #eee', paddingTop: '40px' }}>
        <h1 style={{ color: '#1B3A6B' }}>Your Results</h1>
        <div style={{ fontSize: '80px', fontWeight: '900', color: '#1B3A6B' }}>
          {score ? `${score.toFixed(0)}%` : '--'}
        </div>
        <p style={{ color: '#64748b' }}>Strategic Capability Score</p>
      </div>

      <div style={{ marginTop: '40px' }}>
        <button 
          onClick={() => window.location.href = '/assessment'}
          style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer' }}
        >
          Retake Assessment
        </button>
      </div>
    </div>
  );
}