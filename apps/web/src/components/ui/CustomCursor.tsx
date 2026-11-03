import React, { useEffect, useState } from 'react';

export const CustomCursor: React.FC = () => {
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  });

  useEffect(() => {
    // Graceful fallback for touchscreens and unsupported devices
    if (typeof window === 'undefined' || isTouchDevice) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      if (!isVisible) {
        setIsVisible(true);
        document.documentElement.classList.add('hide-native-cursor');
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
      document.documentElement.classList.remove('hide-native-cursor');
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
      document.documentElement.classList.add('hide-native-cursor');
    };

    const checkHoverTarget = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) {
        setIsHovering(false);
        return;
      }
      const interactive = target.closest(
        'button, a, input, select, textarea, [role="button"], .card-hover, .btn, [data-interactive="true"], .event-row, .lb-btn-primary, .lb-btn-ghost, .lb-pill, [tabindex="0"]'
      );
      setIsHovering(Boolean(interactive));
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousemove', checkHoverTarget, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousemove', checkHoverTarget);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.documentElement.classList.remove('hide-native-cursor');
    };
  }, [isVisible, isTouchDevice]);

  if (isTouchDevice || !isVisible) return null;

  // Use Tesseract's cybernetic theme colors:
  // idle: bright cyan (#00f0ff), hover: tactical yellow/gold (#ffd73b)
  const color = isHovering ? 'var(--c-yellow, #ffd73b)' : 'var(--c-cyan, #00f0ff)';
  const glow = isHovering ? 'rgba(255, 215, 59, 0.45)' : 'rgba(0, 240, 255, 0.35)';

  return (
    <div
      data-testid="tesseract-custom-cursor"
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        pointerEvents: 'none',
        zIndex: 99999,
        transform: 'translate(-50%, -50%)',
        transition: 'transform 0.04s linear, opacity 0.15s ease',
        opacity: isVisible ? 1 : 0,
      }}
      aria-hidden="true"
    >
      {/* Tactical Center Dot */}
      <div
        style={{
          width: isHovering ? '6px' : '4px',
          height: isHovering ? '6px' : '4px',
          background: color,
          borderRadius: '50%',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: `0 0 8px ${color}`,
          transition: 'all 0.15s ease',
        }}
      />

      {/* Crosshair SVG Reticle */}
      <svg
        width={isHovering ? 46 : 34}
        height={isHovering ? 46 : 34}
        viewBox="0 0 44 44"
        style={{
          transition: 'width 0.18s cubic-bezier(0.16, 1, 0.3, 1), height 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'block',
          filter: `drop-shadow(0 0 4px ${glow})`,
        }}
      >
        {/* Outer Corner Brackets */}
        <path
          d="M 6 14 L 6 6 L 14 6"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          opacity={isHovering ? 1 : 0.8}
        />
        <path
          d="M 38 14 L 38 6 L 30 6"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          opacity={isHovering ? 1 : 0.8}
        />
        <path
          d="M 6 30 L 6 38 L 14 38"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          opacity={isHovering ? 1 : 0.8}
        />
        <path
          d="M 38 30 L 38 38 L 30 38"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          opacity={isHovering ? 1 : 0.8}
        />

        {/* Tactical Crosshair Axis Lines */}
        <line x1="22" y1="2" x2="22" y2="8" stroke={color} strokeWidth="1.5" />
        <line x1="22" y1="36" x2="22" y2="42" stroke={color} strokeWidth="1.5" />
        <line x1="2" y1="22" x2="8" y2="22" stroke={color} strokeWidth="1.5" />
        <line x1="36" y1="22" x2="42" y2="22" stroke={color} strokeWidth="1.5" />

        {/* Inner Lock-on Ring when hovering */}
        {isHovering && (
          <circle
            cx="22"
            cy="22"
            r="12"
            fill="none"
            stroke="var(--c-yellow, #ffd73b)"
            strokeWidth="1.2"
            strokeDasharray="4 2"
            style={{
              animation: 'reticle-rotate 6s linear infinite',
              transformOrigin: '22px 22px',
            }}
          />
        )}
      </svg>

      {/* Tiny live coordinate / target lock telemetry tag */}
      <div
        style={{
          position: 'absolute',
          top: '26px',
          left: '26px',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.62rem',
          fontWeight: 700,
          color: color,
          letterSpacing: '0.08em',
          whiteSpace: 'nowrap',
          textShadow: '0 0 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)',
          opacity: 0.9,
          pointerEvents: 'none',
        }}
      >
        {isHovering ? 'TARGET_LOCK' : `${Math.round(pos.x)},${Math.round(pos.y)}`}
      </div>

      <style>{`
        html.hide-native-cursor,
        html.hide-native-cursor *,
        html.hide-native-cursor *::before,
        html.hide-native-cursor *::after {
          cursor: none !important;
        }

        @keyframes reticle-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
