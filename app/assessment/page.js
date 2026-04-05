'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AssessmentPage() {
  const [questions, setQuestions] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  // 2. Load questions from the database
  useEffect(() => {
    async function loadQuestions() {
      const { data } = await supabase.from('questions').select('*');
      if (data && data.length > 0) {
        setQuestions(data);
      } else {
        // Fallback questions
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

  // 3. The "Brain" - Saves results to your database
  const saveResults = async (finalAnswers) => {
    setLoading(true);
    
    // Get the logged-in user
    const { data: { user } } = await supabase.auth.getUser();

    // Create the main record in 'assessment_submissions'
    const { data: submission, error: subError } = await supabase
      .from('assessment_submissions')
      .insert([{ 
          user_id: user?.id, 
          status: 'completed' 
      }])
      .select()
      .single();

    if (subError) {
      console.error("Error creating submission:", subError);
      alert("Check your Supabase tables - something went wrong!");
      setLoading(false);
      return;
    }

    // Prepare individual answers for the 'responses' table
    const responsesToSave = Object.entries(finalAnswers).map(([qId, val]) => ({
      submission_id: submission.id,
      question_id: qId,
      answer_value: val
    }));

    // Save all answers at once
    const { error: respError } = await supabase
      .from('responses')
      .insert(responsesToSave);

    if (respError) {
      console.error("Error saving answers:", respError);
    } else {
      alert("✅ Results Saved to Database! Redirecting...");
      window.location.href = '/dashboard'; 
    }
    setLoading(false);
  };

  const handleAnswer = (value) => {
    const questionId = questions[currentStep].id;
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      saveResults(newAnswers); // This triggers the database save
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Processing...</div>;

  const progress = ((currentStep + 1) / questions.length) * 100;

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', marginBottom: '30px' }}>
        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#1B3A6B', borderRadius: '4px', transition: '0.3s' }} />
      </div>

      <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 'bold' }}>{questions[currentStep].category}</p>
      <h2 style={{ fontSize: '24px', marginBottom: '40px' }}>{questions[currentStep].question_text}</h2>

      <div style={{ display: 'grid', gap: '12px' }}>
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            onClick={() => handleAnswer(num)}
            style={{ padding: '18px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: 'white', cursor: 'pointer', textAlign: 'left' }}
          >
            <strong>{num}</strong> — {num === 1 ? 'Needs Work' : num === 5 ? 'Exceptional' : 'Developing'}
          </button>
        ))}
      </div>
    </div>
  );
}