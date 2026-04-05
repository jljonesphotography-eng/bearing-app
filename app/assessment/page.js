'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. Initialize the Supabase client correctly
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AssessmentPage() {
  const [questions, setQuestions] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  // 2. Load the questions from your database
  useEffect(() => {
    async function loadQuestions() {
      const { data, error } = await supabase.from('questions').select('*');
      
      if (data && data.length > 0) {
        setQuestions(data);
      } else {
        // Fallback if the database table is empty
        setQuestions([
          { id: '1', question_text: "How clear is your team's vision?", category: "Strategy" },
          { id: '2', question_text: "How efficient are your current workflows?", category: "Operations" },
          { id: '3', question_text: "How strong is your team's communication?", category: "Culture" }
        ]);
      }
      setLoading(false);
    }
    loadQuestions();
  }, []);

  const handleAnswer = (value) => {
    const questionId = questions[currentStep].id;
    setAnswers({ ...answers, [questionId]: value });
    
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      alert("Assessment Complete! Ready for Scoring (Step 3).");
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Assessment...</div>;

  const progress = ((currentStep + 1) / questions.length) * 100;

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      {/* Progress Bar */}
      <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', marginBottom: '30px' }}>
        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#1B3A6B', borderRadius: '4px', transition: 'width 0.3s ease' }} />
      </div>

      <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>
        {questions[currentStep].category}
      </p>
      
      <h2 style={{ fontSize: '24px', color: '#1e293b', marginBottom: '40px', lineHeight: '1.4' }}>
        {questions[currentStep].question_text}
      </h2>

      <div style={{ display: 'grid', gap: '12px' }}>
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            onClick={() => handleAnswer(num)}
            style={{
              padding: '18px',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              backgroundColor: 'white',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '16px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#f8fafc';
              e.target.style.borderColor = '#1B3A6B';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.borderColor = '#e2e8f0';
            }}
          >
            <strong>{num}</strong> — {num === 1 ? 'Needs Work' : num === 5 ? 'Exceptional' : 'Developing'}
          </button>
        ))}
      </div>

      <p style={{ marginTop: '30px', color: '#94a3b8', fontSize: '14px' }}>
        Question {currentStep + 1} of {questions.length}
      </p>
    </div>
  );
}