'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function DashboardPage() {
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLatestScore() {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch the most recent submission for this user
      const { data, error } = await supabase
        .from('responses')
        .select('answer_value')
        .order('created_at', { ascending: false })
        .limit(3); // Looking at the last 3 answers (our sample set)

      if (data && data.length > 0) {
        const total = data.reduce((acc, curr) => acc + curr.answer_value, 0);
        const average = (total / data.length).toFixed(1);
        // Convert 1-5 scale to a percentage (e.g., 4.0 = 80%)
        setScore((average / 5) * 100);
      }
      setLoading(false);
    }
    fetchLatestScore();
  }, []);

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Analyzing Capabilities...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '40px' }}>
        <h1 style={{ color: '#1B3A6B', margin: 0 }}>Bearing Dashboard</h1>
        <p style={{ color: '#64748b' }}>Organizational Capability Overview</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* Score Card */}
        <div style={{ padding: '30px', backgroundColor: '#1B3A6B', color: 'white', borderRadius: '15px', textAlign: 'center' }}>
          <h3 style={{ margin: 0, opacity: 0.8 }}>Overall Score</h3>
          <div style={{ fontSize: '64px', fontWeight: 'bold', margin: '20px 0' }}>
            {score ? `${score}%` : 'N/A'}
          </div>
          <p style={{ fontSize: '14px' }}>Based on your last assessment</p>
        </div>

        {/* Insights Card */}
        <div style={{ padding: '30px', backgroundColor: '#f8fafc', borderRadius: '15px', border: '1px solid #e2e8e0' }}>
          <h3 style={{ marginTop: 0, color: '#1e293b' }}>Next Steps</h3>
          <ul style={{ color: '#475569', lineHeight: '1.8' }}>
            <li>{score > 70 ? "✅ Your core strategy is strong." : "⚠️ Focus on vision clarity."}</li>
            <li>Review the detailed <strong>Reporting View</strong> for category gaps.</li>
            <li>Schedule a follow-up with your lead photographer/team.</li>
          </ul>
        </div>
      </div>

      <button 
        onClick={() => window.location.href = '/assessment'}
        style={{ marginTop: '40px', padding: '12px 24px', backgroundColor: 'white', border: '1px solid #1B3A6B', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
      >
        Retake Assessment
      </button>
    </div>
  );
}