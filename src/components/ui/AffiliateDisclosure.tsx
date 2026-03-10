import Link from 'next/link';

export function AffiliateDisclosure() {
  return (
    <p className="text-xs text-zinc-400 dark:text-zinc-500">
      Some links on this page are affiliate links. We may earn a small commission if you make a
      purchase — at no extra cost to you.{' '}
      <Link
        href="/about#affiliate-disclosure"
        className="underline underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        Learn more
      </Link>
    </p>
  );
}
