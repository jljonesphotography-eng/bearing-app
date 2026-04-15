'use client';

import { useEffect, useState } from 'react';

const PHRASE_INTERVAL_MS = 2600;

const PHRASES = [
  'Mapping strategic narrative',
  'Calculating confidence signals',
  'Calibrating capability dimensions',
  'Synthesizing judgment patterns',
  'Extracting evidence from your responses',
  'Building your capability footprint',
  'Composing your assessment report',
  'Weighting zone signals across the conversation'
];

export default function BearingThinkingOverlay() {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % PHRASES.length);
    }, PHRASE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bearing-thinking-overlay">
      <div className="bearing-thinking-pulse-host" aria-hidden>
        <div className="bearing-thinking-ripple" />
        <div className="bearing-thinking-orbit" />
        <div className="bearing-thinking-core" />
      </div>
      <p key={phraseIndex} className="bearing-thinking-phrase" role="status" aria-live="polite">
        {PHRASES[phraseIndex]}
      </p>
    </div>
  );
}
