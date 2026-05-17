import React from 'react';

/**
 * GradientText – Animated flowing gradient on text.
 * Pure CSS animation, zero dependencies.
 */
export default function GradientText({
  children,
  className = '',
  colors = ['#00f5ff', '#bf00ff', '#00ff88', '#00f5ff'],
  animationSpeed = 4,
  showBorder = false,
}) {
  const gradientStyle = {
    backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
    backgroundSize: '300% 100%',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: `rb-gradient-flow ${animationSpeed}s linear infinite`,
    display: 'inline-block',
  };

  const borderStyle = showBorder ? {
    border: '2px solid transparent',
    borderImage: `linear-gradient(90deg, ${colors.join(', ')}) 1`,
    borderImageSlice: 1,
    padding: '0.25em 0.5em',
    borderRadius: '0.5em',
  } : {};

  return (
    <>
      <style>{`
        @keyframes rb-gradient-flow {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      <span className={className} style={{ ...gradientStyle, ...borderStyle }}>
        {children}
      </span>
    </>
  );
}
