'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SearchLoading } from './SearchLoading';

export function SearchBar() {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const isUrl = (value: string) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    setError('');
    setIsLoading(true);

    const body = isUrl(trimmed) ? { url: trimmed } : { text: trimmed };

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        setIsLoading(false);
        return;
      }

      startTransition(() => {
        router.push(`/compare/${data.slug}`);
      });
    } catch {
      setError('Network error — please try again');
      setIsLoading(false);
    }
  };

  const loading = isLoading || isPending;

  if (loading) {
    return <SearchLoading />;
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a product URL or describe a piece of furniture…"
          className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-zinc-400"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="rounded-xl bg-zinc-900 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Compare
        </button>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}

      <p className="mt-2 text-xs text-zinc-400">
        Works with Wayfair, Article, West Elm, AllModern, Crate &amp; Barrel — or just describe what you&apos;re looking at.
      </p>
    </form>
  );
}
