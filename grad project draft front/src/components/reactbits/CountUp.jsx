import React, { useEffect, useRef, useState } from 'react';

/**
 * CountUp – Animates a number from `from` to `to` when scrolled into view.
 * Pure JS, zero dependencies.
 */
export default function CountUp({
  from = 0,
  to = 100,
  duration = 2000,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
  threshold = 0.3,
}) {
  const ref = useRef(null);
  const [value, setValue] = useState(from);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) { setStarted(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, started]);

  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (to - from) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, from, to, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{value.toFixed(decimals)}{suffix}
    </span>
  );
}
