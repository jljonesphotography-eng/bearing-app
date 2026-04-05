'use client';
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AssessmentPage() {
  const [questions, setQuestions] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  // 1. Fetch questions from your new database table
  useEffect(() => {
    async function loadQuestions() {
      const { data } = await supabase.from('questions').select('*');
      if (data && data.length > 0) {
        setQuestions(data);
      } else {
        // Fallback sample questions if database is empty
        setQuestions([
          { id: 1, question_text: "How clear is your team's vision?", category: "Strategy" },
          { id: 2, question_text: "How efficient are your current workflows?", category: "Operations" },
          { id: 3, question_text: "How strong is your team's communication?", category: "Culture" }
        ]);
      }
      setLoading(false);
    }
    loadQuestions();
  }, []);

  const handleAnswer = (value) => {
    setAnswers({ ...answers, [questions[currentStep].id]: value });
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      alert("Assessment Complete! Ready for Scoring (Step 3).");
    }
  };

  if (loading) return <div className="p-10 text-center">Loading Assessment...</div>;

  const progress = ((currentStep + 1) / questions.length) * 100;

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', fontFamily: 'Arial' }}>
      {/* Progress Bar */}
      <div style={{ width: '100%', height: '10px', bg: '#eee', borderRadius: '5px', marginBottom: '20px', backgroundColor: '#e2e8f0' }}>
        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#1B3A6B', borderRadius: '5px', transition: '0.3s' }} />
      </div>

      <p style={{ color: '#666', fontSize: '14px' }}>{questions[currentStep].category}</p>
      <h2 style={{ fontSize: '24px', marginBottom: '30px' }}>{questions[currentStep].question_text}</h2>

      <div style={{ display: 'grid', gap: '10px' }}>
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            onClick={() => handleAnswer(num)}
            style={{
              padding: '15px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              backgroundColor: 'white',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '16px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#f8fafc'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
          >
            {num} - {num === 1 ? 'Very Low' : num === 5 ? 'Exceptional' : 'Standard'}
          </button>
        ))}
      </div>

      <p style={{ marginTop: '20px', color: '#94a3b8' }}>Question {currentStep + 1} of {questions.length}</p>
    </div>
  );
}