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
      const { data } = await supabase.from('responses').select('answer_value').limit(3);
      if (data && data.length > 0) {
        const total = data.reduce((acc, curr) => acc + curr.answer_value, 0);
        setScore((total / 15) * 100);
      }
    }
    getScore();
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

  return (
    <div style={{ padding: '50px', textAlign: 'center', backgroundColor: '#fff', minHeight: '100vh' }}>
      <h1 style={{ color: '#1B3A6B', fontSize: '40px' }}>NEW DASHBOARD ACTIVE</h1>
      
      <button 
        onClick={handleUpgrade}
        style={{ 
          backgroundColor: '#FFD700', 
          padding: '25px 50px', 
          fontSize: '24px', 
          fontWeight: 'bold', 
          borderRadius: '15px', 
          cursor: 'pointer',
          margin: '40px 0',
          border: '3px solid #1B3A6B'
        }}
      >
        🌟 UPGRADE TO PRO NOW 🌟
      </button>

      <div style={{ marginTop: '20px' }}>
        <p>Current Score: {score ? `${score.toFixed(0)}%` : '--'}</p>
      </div>
    </div>
  );
}