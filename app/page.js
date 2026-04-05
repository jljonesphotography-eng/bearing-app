'use client';
import Image from "next/image";

export default function Home() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f0f4f8', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '60px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        maxWidth: '500px',
        width: '100%'
      }}>
        <h1 style={{ color: '#1B3A6B', fontSize: '36px', marginBottom: '10px' }}>
          Bearing
        </h1>
        <p style={{ color: '#666', fontSize: '18px', marginBottom: '40px' }}>
          Human Capital Intelligence
        </p>

        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <a href="/login" style={{ 
            padding: '12px 30px', 
            backgroundColor: '#1B3A6B', 
            color: 'white', 
            borderRadius: '6px', 
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '16px'
          }}>
            Log In
          </a>
          <a href="/signup" style={{ 
            padding: '12px 30px', 
            border: '2px solid #1B3A6B', 
            color: '#1B3A6B', 
            borderRadius: '6px', 
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '16px'
          }}>
            Sign Up
          </a>
        </div>
      </div>
      
      <p style={{ marginTop: '30px', color: '#999', fontSize: '12px' }}>
        © 2026 Bearing Systems
      </p>
    </div>
  );
}