'use client';

import { useEffect, useMemo, useState } from 'react';
import { scoreColors } from '@/lib/score';

interface ValueScoreBadgeProps {
  score: number;
  size?: 'sm' | 'lg';
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent Value';
  if (score >= 70) return 'Good Value';
  if (score >= 40) return 'Fair Value';
  if (score >= 20) return 'Overpriced';
  return 'Poor Value';
}

export function ValueScoreBadge({ score, size = 'lg' }: ValueScoreBadgeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  const isLarge = size === 'lg';
  const svgSize = isLarge ? 120 : 64;
  const radius = isLarge ? 48 : 26;
  const strokeWidth = isLarge ? 8 : 5;
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);
  const colors = useMemo(() => scoreColors(score), [score]);

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 1200;

    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    }

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const filled = (animatedScore / 100) * circumference;
  const dashOffset = circumference - filled;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          {/* Track */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-zinc-100 dark:text-zinc-800"
          />
          {/* Progress */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.05s linear' }}
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`font-bold ${colors.text} ${isLarge ? 'text-3xl' : 'text-base'}`}
          >
            {animatedScore}
          </span>
        </div>
      </div>

      {isLarge && (
        <span className={`text-sm font-semibold ${colors.text}`}>
          {scoreLabel(score)}
        </span>
      )}
    </div>
  );
}
