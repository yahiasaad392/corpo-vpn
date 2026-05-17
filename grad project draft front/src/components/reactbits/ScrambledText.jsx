import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * ScrambledText – Text that scrambles on hover or on mount.
 * Pure JS, zero dependencies.
 */
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

export default function ScrambledText({
  text = '',
  className = '',
  speed = 50,
  scrambleOnHover = true,
  scrambleOnMount = true,
  revealDirection = 'start',
  scrambleChars = CHARS,
}) {
  const [displayed, setDisplayed] = useState(scrambleOnMount ? '' : text);
  const [isScrambling, setIsScrambling] = useState(false);
  const intervalRef = useRef(null);
  const mountedRef = useRef(false);

  const scramble = useCallback(() => {
    if (isScrambling) return;
    setIsScrambling(true);
    let iteration = 0;
    const len = text.length;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayed(
        text
          .split('')
          .map((char, idx) => {
            const revealIdx = revealDirection === 'end' ? len - 1 - idx : idx;
            if (char === ' ') return ' ';
            if (revealIdx < iteration) return char;
            return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
          })
          .join('')
      );
      iteration += 1 / 3;
      if (iteration >= len) {
        clearInterval(intervalRef.current);
        setDisplayed(text);
        setIsScrambling(false);
      }
    }, speed);
  }, [text, speed, revealDirection, scrambleChars, isScrambling]);

  useEffect(() => {
    if (!mountedRef.current && scrambleOnMount) {
      mountedRef.current = true;
      scramble();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [scramble, scrambleOnMount]);

  return (
    <span
      className={className}
      onMouseEnter={scrambleOnHover ? scramble : undefined}
      style={{ fontFamily: "'JetBrains Mono', monospace", display: 'inline-block' }}
    >
      {displayed || text}
    </span>
  );
}
