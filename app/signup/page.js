'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ backgroundColor: 'white', padding: '48px', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: '100%', maxWidth: '420px' }}>
        <h1 style={{ color: '#1B3A6B', marginBottom: '8px', fontSize: '28px' }}>Create Account</h1>
        <p style={{ color: '#666', marginBottom: '32px', fontSize: '14px' }}>Bearing — Human Capital Intelligence</p>

        <form onSubmit={handleSignup}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600', color: '#333' }}>Email Address</label>
            <input 
              type="email" 
              required
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="jane@acmecorp.com" 
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} 
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600', color: '#333' }}>Password</label>
            <input 
              type="password" 
              required
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Create a password" 
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} 
            />
          </div>

          <button 
            type="submit"
            disabled={loading} 
            style={{ width: '100%', padding: '12px', backgroundColor: loading ? '#aaa' : '#1B3A6B', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        {message && (
          <p style={{ marginTop: '16px', padding: '12px', borderRadius: '6px', backgroundColor: message.startsWith('Error') ? '#fff0f0' : '#f0fff4', color: message.startsWith('Error') ? '#c00' : '#006620', fontSize: '14px', textAlign: 'center' }}>
            {message}
          </p>
        )}

        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
          Already have an account? <a href="/login" style={{ color: '#1B3A6B', fontWeight: '600' }}>Log in</a>
        </p>
      </div>
    </div>
  );
}