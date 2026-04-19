import React, { useState, useEffect } from 'react';

// A dynamic SVG representing the chubby flat hands. 
// Features white thick outline and colored fill. 5 fingers and a thumb.
const HandIcon = ({ count, color }) => {
  const isBlue = color === 'blue';
  const fill = isBlue ? 'var(--primary-blue)' : 'var(--primary-red)';
  const stroke = 'white';
  const strokeWidth = 8;
  
  // We determine which fingers are up. 0 means all folded (fist).
  // Thumb implicitly up for count >= 5
  // Count mapping:
  // 0: Fist
  // 1: Index
  // 2: Index + Middle
  // 3: Index + Middle + Ring
  // 4: Index + Middle + Ring + Pinky
  // 5: All fingers
  // 6: Pinky + Thumb (often used for 6 in hand cricket)

  const f1 = count >= 1 && count <= 5; // Index
  const f2 = count >= 2 && count <= 5; // Middle
  const f3 = count >= 3 && count <= 5; // Ring
  const f4 = count >= 4 && count <= 5 || count === 6; // Pinky
  const thumb = count === 5 || count === 6; // Thumb

  // Create smooth animated transitions for fingers by scaling Y
  const fingerStyle = (isActive) => ({
    transformOrigin: 'bottom',
    transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    transform: isActive ? 'scaleY(1)' : 'scaleY(0.3)'
  });

  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{dropShadow: '0 4px 10px rgba(0,0,0,0.3)'}}>
      <g stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round">
        {/* Palm */}
        <rect x="50" y="90" width="100" height="90" rx="30" fill={fill} />
        
        {/* Thumb */}
        <path d="M 150 130 C 180 130, 180 90, 150 90" fill={fill} style={fingerStyle(thumb)} />

        {/* Fingers (Left to Right) */}
        {/* Pinky */}
        <rect x="55" y="40" width="20" height="60" rx="10" fill={fill} style={fingerStyle(f4)} />
        {/* Ring */}
        <rect x="80" y="25" width="20" height="75" rx="10" fill={fill} style={fingerStyle(f3)} />
        {/* Middle */}
        <rect x="105" y="15" width="20" height="85" rx="10" fill={fill} style={fingerStyle(f2)} />
        {/* Index */}
        <rect x="130" y="25" width="20" height="75" rx="10" fill={fill} style={fingerStyle(f1)} />

        {/* Sleeve/Wrist */}
        <path d="M 40 180 L 160 180 L 180 220 L 20 220 Z" fill="#E8B298" stroke="none" />
      </g>
    </svg>
  );
};

export default HandIcon;
