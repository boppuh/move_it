import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          © {new Date().getFullYear()} Is It Worth It? · AI-powered furniture value comparisons.
        </p>
        <div className="flex gap-4 text-xs text-zinc-400 dark:text-zinc-500">
          <Link href="/browse" className="hover:text-zinc-600 dark:hover:text-zinc-300">
            Browse
          </Link>
          <Link href="/about" className="hover:text-zinc-600 dark:hover:text-zinc-300">
            About
          </Link>
          <Link href="/about#affiliate-disclosure" className="hover:text-zinc-600 dark:hover:text-zinc-300">
            Affiliate Disclosure
          </Link>
        </div>
      </div>
    </footer>
  );
}
