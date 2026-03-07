'use client';

import Link from 'next/link';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-6 px-4 py-24 text-center">
      <p className="text-6xl font-bold text-zinc-200 dark:text-zinc-700">500</p>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Something went wrong</h1>
      <p className="text-zinc-500 dark:text-zinc-400">
        An unexpected error occurred. Please try again.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
