'use client';
export default function ReportPage() {
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
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#FFD700', padding: '40px', borderRadius: '20px', border: '4px solid #1B3A6B' }}>
        <h2 style={{ color: '#1B3A6B' }}>UPGRADE TO UNLOCK FULL REPORT</h2>
        <button onClick={handleUpgrade} style={{ backgroundColor: '#1B3A6B', color: 'white', padding: '15px 40px', fontSize: '18px', fontWeight: 'bold', borderRadius: '10px', cursor: 'pointer' }}>
          UPGRADE TO PRO NOW
        </button>
      </div>
      <h1 style={{ marginTop: '40px' }}>Detailed Capability Report</h1>
    </div>
  );
}