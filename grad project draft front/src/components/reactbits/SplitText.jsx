import React, { useEffect, useRef, useState } from 'react';

/**
 * SplitText – ReactBits-style letter-by-letter reveal animation.
 * Pure CSS keyframes, zero dependencies.
 */
export default function SplitText({
  text = '',
  className = '',
  delay = 30,
  animationFrom = { opacity: 0, transform: 'translateY(40px) scale(0.95)' },
  animationTo   = { opacity: 1, transform: 'translateY(0) scale(1)' },
  threshold = 0.2,
  rootMargin = '-50px',
  onLetterAnimationComplete,
}) {
  const containerRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold, rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin]);

  const letters = text.split('');

  return (
    <span ref={containerRef} className={className} style={{ display: 'inline-block' }}>
      {letters.map((char, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            whiteSpace: char === ' ' ? 'pre' : 'normal',
            transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * delay}ms`,
            ...(inView ? animationTo : animationFrom),
          }}
          onTransitionEnd={i === letters.length - 1 ? onLetterAnimationComplete : undefined}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}
