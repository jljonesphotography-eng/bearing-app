'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ReportingPage() {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      // This query gets the answers AND the category names from the questions table
      const { data, error } = await supabase
        .from('responses')
        .select(`
          answer_value,
          questions (category)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        // Simple logic to group by category
        const categories = {};
        data.forEach(item => {
          const cat = item.questions?.category || 'General';
          if (!categories[cat]) categories[cat] = { total: 0, count: 0 };
          categories[cat].total += item.answer_value;
          categories[cat].count += 1;
        });
        
        const formatted = Object.keys(categories).map(name => ({
          name,
          score: ((categories[name].total / (categories[name].count * 5)) * 100).toFixed(0)
        }));
        setReportData(formatted);
      }
      setLoading(false);
    }
    loadReport();
  }, []);

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Generating Report...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <button onClick={() => window.location.href = '/dashboard'} style={{ color: '#1B3A6B', border: 'none', background: 'none', cursor: 'pointer', marginBottom: '20px' }}>
        ← Back to Dashboard
      </button>
      
      <h1 style={{ marginBottom: '10px' }}>Detailed Capability Report</h1>
      <p style={{ color: '#64748b', marginBottom: '40px' }}>Breakdown of organizational maturity by department.</p>

      <div style={{ display: 'grid', gap: '20px' }}>
        {reportData.map((item) => (
          <div key={item.name} style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{item.name}</span>
              <span style={{ color: '#1B3A6B', fontWeight: 'bold' }}>{item.score}%</span>
            </div>
            {/* Simple Progress Bar */}
            <div style={{ width: '100%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
              <div style={{ 
                width: `${item.score}%`, 
                height: '100%', 
                backgroundColor: item.score > 70 ? '#10b981' : '#f59e0b', 
                borderRadius: '6px' 
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}