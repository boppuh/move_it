import Link from 'next/link';

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-4 py-3">
        {/* Logo */}
        <Link
          href="/"
          className="text-sm font-bold text-zinc-900 dark:text-zinc-50"
        >
          Is It Worth It?
        </Link>

        {/* Links */}
        <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/browse" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Browse
          </Link>
          <Link href="/about" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            About
          </Link>
          <Link
            href="/"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            New comparison →
          </Link>
        </div>
      </nav>
    </header>
  );
}
