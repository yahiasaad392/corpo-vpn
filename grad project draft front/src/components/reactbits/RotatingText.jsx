import React, { useState, useEffect } from 'react';

/**
 * RotatingText – Cycles through an array of words with a slide animation.
 * Pure CSS, zero dependencies.
 */
export default function RotatingText({
  words = ['Secure', 'Fast', 'Intelligent'],
  interval = 2500,
  className = '',
  colors = ['#00f5ff', '#00ff88', '#bf00ff'],
}) {
  const [index, setIndex] = useState(0);
  const [animState, setAnimState] = useState('in'); // 'in' | 'out'

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimState('out');
      setTimeout(() => {
        setIndex(prev => (prev + 1) % words.length);
        setAnimState('in');
      }, 300);
    }, interval);
    return () => clearInterval(timer);
  }, [words.length, interval]);

  const color = colors[index % colors.length];

  return (
    <>
      <style>{`
        @keyframes rb-rotate-in {
          from { opacity: 0; transform: translateY(100%) rotateX(-80deg); filter: blur(4px); }
          to   { opacity: 1; transform: translateY(0) rotateX(0deg); filter: blur(0px); }
        }
        @keyframes rb-rotate-out {
          from { opacity: 1; transform: translateY(0) rotateX(0deg); filter: blur(0px); }
          to   { opacity: 0; transform: translateY(-100%) rotateX(80deg); filter: blur(4px); }
        }
      `}</style>
      <span
        className={className}
        style={{
          display: 'inline-block',
          color,
          textShadow: `0 0 25px ${color}60`,
          animation: animState === 'in'
            ? 'rb-rotate-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            : 'rb-rotate-out 0.3s cubic-bezier(0.7, 0, 0.84, 0) forwards',
          perspective: '500px',
          minWidth: '5ch',
          textAlign: 'center',
        }}
      >
        {words[index]}
      </span>
    </>
  );
}
