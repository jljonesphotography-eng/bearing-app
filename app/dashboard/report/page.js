'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Connect to your Supabase project
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function DashboardPage() {
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch your latest assessment score from Supabase
  useEffect(() => {
    async function fetchLatestScore() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data } = await supabase
            .from('responses')
            .select('answer_value')
            .order('created_at', { ascending: false })
            .limit(3);

          if (data && data.length > 0) {
            const total = data.reduce((acc, curr) => acc + curr.answer_value, 0);
            const average = (total / data.length).toFixed(1);
            setScore((average / 5) * 100);
          }
        }
      } catch (error) {
        console.error("Error loading scores:", error);
      }
      setLoading(false);
    }
    fetchLatestScore();
  }, []);

  // 2. The Stripe Upgrade Function
  const handleUpgrade = async () => {
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: 'price_1TIusD4hZvzU4tlplZYY6WAJ' }), // Your Test Mode Price ID
      });
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url; // Sends user to Stripe
      } else {
        alert("Configuration Error: Please check your Vercel Environment Variables.");
      }
    } catch (err) {
      console.error("Stripe Error:", err);
      alert("Failed to connect to the payment gateway.");
    }
  };

  if (loading) return <div style={{ padding: '100px', textAlign: 'center', fontFamily: 'sans-serif' }}>Loading your Bearing...</div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ color: '#1B3A6B', marginBottom: '8px', fontSize: '32px' }}>Your Dashboard</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Strategic Capability & Insights</p>
        </div>
        
        {/* The Upgrade Button */}
        <button 
          onClick={handleUpgrade}
          style={{ 
            padding: '14px 28px', 
            backgroundColor: '#FFD700', 
            color: '#1B3A6B', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
          }}
        >
          Upgrade to Pro
        </button>
      </div>

      {/* Main Score Display */}
      <div style={{ 
        backgroundColor: '#f8fafc', 
        padding: '60px 40px', 
        borderRadius: '24px', 
        border: '1px solid #e2e8f0', 
        textAlign: 'center',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{ color: '#1B3A6B', marginTop: 0, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '14px' }}>
          Overall Capability Score
        </h2>
        <div style={{ fontSize: '96px', fontWeight: '900', color: '#1B3A6B', margin: '10px 0' }}>
          {score ? `${score.toFixed(0)}%` : '--'}
        </div>
        <p style={{ maxWidth: '450px', margin: '0 auto', color: '#475569', lineHeight: '1.6' }}>
          This score reflects your current alignment. To unlock deeper analytics and Claude-powered reporting, use the **Upgrade** button above.
        </p>
      </div>

      {/* Footer Actions */}
      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <button 
          onClick={() => window.location.href = '/assessment'}
          style={{ 
            padding: '12px 24px', 
            backgroundColor: 'transparent', 
            border: '2px solid #1B3A6B', 
            color: '#1B3A6B',
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontWeight: 'bold' 
          }}
        >
          Retake Assessment
        </button>
      </div>
    </div>
  );
}