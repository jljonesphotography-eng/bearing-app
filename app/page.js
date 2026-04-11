'use client';

const BG = '#faf9f6';
const TEXT = '#1a1916';
const MUTED = '#6B6A66';
const NAVY = '#1B3A6B';
const TEAL = '#0A5F63';
const AMBER = '#D97706';
const SURFACE = '#ffffff';
const FONT_SANS =
  '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';
const FONT_DISPLAY = '"Playfair Display", Georgia, serif';

const paths = [
  { label: 'Me', sub: 'individual', href: '/signup' },
  { label: 'My team', sub: 'B2B', href: '/signup' },
  { label: 'My organization', sub: 'institutional', href: '/signup' }
];

const verdictPills = [
  { text: 'WELL-POSITIONED', bg: TEAL, fg: '#ffffff' },
  { text: 'TRANSITION ADVISED', bg: AMBER, fg: '#1a1916' },
  { text: 'EXPOSED', bg: NAVY, fg: '#ffffff' }
];

export default function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: BG,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: FONT_SANS,
        color: TEXT,
        padding: '32px 20px 40px'
      }}
    >
      <div
        style={{
          maxWidth: 720,
          width: '100%',
          textAlign: 'center'
        }}
      >
        <p
          style={{
            color: NAVY,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 20
          }}
        >
          Bearing
        </p>

        <h1
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 'clamp(1.5rem, 4vw, 2.125rem)',
            fontWeight: 600,
            lineHeight: 1.35,
            color: TEXT,
            margin: '0 0 20px',
            maxWidth: 640,
            marginLeft: 'auto',
            marginRight: 'auto'
          }}
        >
          Find out what you actually bring. Then learn exactly how to use AI to amplify it.
        </h1>

        <p
          style={{
            color: MUTED,
            fontSize: 17,
            lineHeight: 1.65,
            margin: '0 auto 36px',
            maxWidth: 600,
            textAlign: 'left'
          }}
        >
          Bearing observes how you think under real work conditions — not how you describe yourself —
          and builds a capability map specific to you. Then it shows you exactly how to use AI to extend
          what makes you valuable.
        </p>

        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: MUTED,
            marginBottom: 12
          }}
        >
          Start with your path
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 36,
            textAlign: 'left'
          }}
        >
          {paths.map((p) => (
            <a
              key={p.label}
              href={p.href}
              style={{
                display: 'block',
                padding: '18px 16px',
                backgroundColor: SURFACE,
                border: `1px solid rgba(27, 58, 107, 0.18)`,
                borderRadius: 12,
                textDecoration: 'none',
                color: TEXT,
                boxShadow: '0 1px 3px rgba(26,25,22,0.06)',
                transition: 'border-color 0.15s ease'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 17, color: NAVY, marginBottom: 4 }}>{p.label}</div>
              <div style={{ fontSize: 13, color: MUTED }}>{p.sub}</div>
            </a>
          ))}
        </div>

        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: MUTED,
            marginBottom: 12
          }}
        >
          Assessment outcomes
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'center',
            marginBottom: 36
          }}
        >
          {verdictPills.map((pill) => (
            <span
              key={pill.text}
              style={{
                display: 'inline-block',
                padding: '8px 14px',
                borderRadius: 999,
                backgroundColor: pill.bg,
                color: pill.fg,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em'
              }}
            >
              {pill.text}
            </span>
          ))}
        </div>

        <p
          style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: TEXT,
            margin: '0 auto 32px',
            maxWidth: 560
          }}
        >
          The assessment takes 30-45 minutes. It ends with a specific action map and your AI
          collaboration guide.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: 8
          }}
        >
          <a
            href="/login"
            style={{
              padding: '12px 28px',
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
              padding: '12px 28px',
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

      <p style={{ marginTop: 'auto', paddingTop: 32, color: MUTED, fontSize: 12 }}>
        © 2026 Bearing Systems
      </p>
    </div>
  );
}
