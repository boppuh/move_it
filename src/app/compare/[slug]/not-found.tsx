import Link from 'next/link';

export default function ComparisonNotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-6 px-4 py-24 text-center">
      <p className="text-6xl font-bold text-zinc-200 dark:text-zinc-700">404</p>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Comparison not found</h1>
      <p className="text-zinc-500 dark:text-zinc-400">
        This comparison may have been removed or the link is invalid.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Start a new comparison →
      </Link>
    </main>
  );
}
