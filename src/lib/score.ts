/** Returns SVG stroke hex + Tailwind text class for a given 1–100 value score. */
export function scoreColors(score: number): { stroke: string; text: string } {
  if (score >= 70) return { stroke: '#16a34a', text: 'text-green-600 dark:text-green-400' };
  if (score >= 40) return { stroke: '#ca8a04', text: 'text-yellow-600 dark:text-yellow-400' };
  return { stroke: '#dc2626', text: 'text-red-500 dark:text-red-400' };
}

/** Returns only the Tailwind text class, with null handled as muted. */
export function scoreTextColor(score: number | null): string {
  if (score == null) return 'text-zinc-400';
  return scoreColors(score).text;
}
