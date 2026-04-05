'use client';

export default function DashboardPage() {
  return (
    <div style={{ padding: '60px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#1B3A6B' }}>📍 You’ve Arrived!</h1>
      <p style={{ fontSize: '18px', color: '#666' }}>
        This is the inner sanctum of the <strong>Bearing App</strong>.
      </p>
      <div style={{ marginTop: '30px', padding: '20px', border: '1px dotted #ccc', display: 'inline-block' }}>
        <p>User Status: <strong>Logged In ✅</strong></p>
      </div>
    </div>
  );
}