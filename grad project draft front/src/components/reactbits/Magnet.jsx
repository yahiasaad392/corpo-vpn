import React, { useRef, useState } from 'react';

/**
 * Magnet – Element follows the cursor when hovered.
 * Pure CSS transform, zero dependencies.
 */
export default function Magnet({
  children,
  padding = 60,
  strength = 0.35,
  className = '',
  disabled = false,
}) {
  const ref = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    setOffset({ x: dx * strength, y: dy * strength });
  };

  const handleMouseLeave = () => setOffset({ x: 0, y: 0 });

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'inline-block',
        transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        padding: `${padding}px`,
        margin: `-${padding}px`,
      }}
    >
      {children}
    </div>
  );
}
