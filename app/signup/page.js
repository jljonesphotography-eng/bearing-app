'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';

const BG = '#faf9f6';
const TEXT = '#1a1916';
const MUTED = '#6B6A66';
const NAVY = '#1B3A6B';
const TEAL = '#0A5F63';
const SURFACE = '#ffffff';
const FONT_SANS =
  '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      setMessage('Error: ' + error.message);
      setLoading(false);
      return;
    }

    setMessage('Success! Check your email for a confirmation link.');
    setLoading(false);
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
          Create Account
        </h1>
        <p style={{ color: MUTED, marginBottom: 32, fontSize: 14 }}>
          Bearing — Human Capability Intelligence
        </p>

        <form onSubmit={handleSignup}>
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
              required
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
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
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
            type="submit"
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
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        {message && (
          <p
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
              backgroundColor: message.startsWith('Error')
                ? '#fff0f0'
                : '#f0fff4',
              color: message.startsWith('Error') ? '#c00' : '#006620',
              fontSize: 14,
              textAlign: 'center'
            }}
          >
            {message}
          </p>
        )}

        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: MUTED }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: TEAL, fontWeight: 600 }}>
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}
