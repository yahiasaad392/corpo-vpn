import React from 'react';

/**
 * ShinyText – ReactBits-style shimmer highlight effect on text.
 * Pure CSS animation, zero dependencies.
 */
export default function ShinyText({
  children,
  className = '',
  baseColor = 'rgba(255,255,255,0.5)',
  shineColor = 'rgba(0,245,255,0.9)',
  speed = '3s',
  disabled = false,
}) {
  return (
    <>
      <style>{`
        @keyframes rb-shiny-slide {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
      <span
        className={className}
        style={{
          color: baseColor,
          backgroundImage: disabled
            ? 'none'
            : `linear-gradient(90deg, ${baseColor} 0%, ${shineColor} 45%, ${shineColor} 55%, ${baseColor} 100%)`,
          backgroundSize: '200% auto',
          WebkitBackgroundClip: disabled ? undefined : 'text',
          backgroundClip: disabled ? undefined : 'text',
          WebkitTextFillColor: disabled ? undefined : 'transparent',
          animation: disabled ? 'none' : `rb-shiny-slide ${speed} linear infinite`,
          display: 'inline-block',
        }}
      >
        {children}
      </span>
    </>
  );
}
