'use client';

import { useEffect, useState } from 'react';

const STEPS = [
  { label: 'Identifying product…', duration: 2000 },
  { label: 'Finding similar furniture…', duration: 3000 },
  { label: 'Analyzing value…', duration: 3000 },
  { label: 'Building your comparison…', duration: 2000 },
];

export function SearchLoading() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let accumulated = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    STEPS.forEach((step, i) => {
      if (i === 0) return;
      accumulated += STEPS[i - 1].duration;
      const timer = setTimeout(() => setCurrentStep(i), accumulated);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 py-16">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      </div>

      <div className="flex flex-col items-center gap-2">
        {STEPS.map((step, i) => (
          <div
            key={step.label}
            className={`flex items-center gap-2 text-sm transition-all duration-300 ${
              i === currentStep
                ? 'font-semibold text-zinc-900 dark:text-zinc-50'
                : i < currentStep
                ? 'text-zinc-400 line-through dark:text-zinc-600'
                : 'text-zinc-300 dark:text-zinc-700'
            }`}
          >
            {i < currentStep ? (
              <span className="text-green-500">✓</span>
            ) : i === currentStep ? (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-900 dark:bg-zinc-100" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            )}
            {step.label}
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-400">This takes about 10 seconds</p>
    </div>
  );
}
