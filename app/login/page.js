'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

const BG = '#faf9f6';
const TEXT = '#1a1916';
const MUTED = '#6B6A66';
const NAVY = '#1B3A6B';
const SURFACE = '#ffffff';
const FONT_SANS =
  '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMessage('Error: ' + error.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_SANS,
        color: TEXT
      }}
    >
      <div
        style={{
          backgroundColor: SURFACE,
          padding: 48,
          borderRadius: 12,
          border: `1px solid rgba(27, 58, 107, 0.12)`,
          boxShadow: '0 2px 16px rgba(26, 25, 22, 0.06)',
          width: '100%',
          maxWidth: 420
        }}
      >
        <h1 style={{ color: NAVY, marginBottom: 8, fontSize: 28, fontWeight: 700 }}>
          Welcome Back
        </h1>
        <p style={{ color: MUTED, marginBottom: 32, fontSize: 14 }}>
          Bearing — Human Capability Intelligence
        </p>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 14,
              fontWeight: 600,
              color: TEXT
            }}
          >
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@acmecorp.com"
            style={{
              width: '100%',
              padding: '10px 14px',
              border: `1px solid rgba(26, 25, 22, 0.15)`,
              borderRadius: 8,
              fontSize: 14,
              boxSizing: 'border-box',
              fontFamily: FONT_SANS,
              color: TEXT
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: 'block',
              marginBottom: 6,
              fontSize: 14,
              fontWeight: 600,
              color: TEXT
            }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            style={{
              width: '100%',
              padding: '10px 14px',
              border: `1px solid rgba(26, 25, 22, 0.15)`,
              borderRadius: 8,
              fontSize: 14,
              boxSizing: 'border-box',
              fontFamily: FONT_SANS,
              color: TEXT
            }}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: 12,
            backgroundColor: loading ? MUTED : NAVY,
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: FONT_SANS
          }}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>

        {message && (
          <p
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
              backgroundColor: '#fff0f0',
              color: '#c00',
              fontSize: 14,
              textAlign: 'center'
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
