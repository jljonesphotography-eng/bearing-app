'use client';

const BG = '#faf9f6';
const TEXT = '#1a1916';
const MUTED = '#6B6A66';
const NAVY = '#1B3A6B';
const SURFACE = '#ffffff';
const FONT_SANS =
  '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';

export default function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: BG,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_SANS,
        color: TEXT,
        textAlign: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          backgroundColor: SURFACE,
          padding: '60px',
          borderRadius: 12,
          border: `1px solid rgba(27, 58, 107, 0.12)`,
          boxShadow: '0 2px 16px rgba(26, 25, 22, 0.06)',
          maxWidth: 500,
          width: '100%'
        }}
      >
        <h1 style={{ color: NAVY, fontSize: 36, marginBottom: 10, fontWeight: 700 }}>
          Bearing
        </h1>
        <p style={{ color: MUTED, fontSize: 18, marginBottom: 40 }}>
          Human Capability Intelligence
        </p>

        <div style={{ display: 'flex', gap: 15, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="/login"
            style={{
              padding: '12px 30px',
              backgroundColor: NAVY,
              color: '#ffffff',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 16
            }}
          >
            Log In
          </a>
          <a
            href="/signup"
            style={{
              padding: '12px 30px',
              border: `2px solid ${NAVY}`,
              color: NAVY,
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 16,
              backgroundColor: SURFACE
            }}
          >
            Sign Up
          </a>
        </div>
      </div>

      <p style={{ marginTop: 30, color: MUTED, fontSize: 12 }}>
        © 2026 Bearing Systems
      </p>
    </div>
  );
}
