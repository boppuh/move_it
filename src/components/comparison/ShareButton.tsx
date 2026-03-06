'use client';

import { useEffect, useState } from 'react';

interface ShareButtonProps {
  slug: string;
  title: string;
}

export function ShareButton({ slug, title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(`/compare/${slug}`);

  useEffect(() => {
    setUrl(`${window.location.origin}/compare/${slug}`);
  }, [slug]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Increment share count
      await fetch(`/api/compare/${slug}/share`, { method: 'POST' }).catch(() => {});
    } catch {
      // Fallback: select and copy
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `Is it worth it? ${title} — check out this AI furniture value analysis`
  )}&url=${encodeURIComponent(url)}`;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {copied ? '✓ Copied!' : '⎘ Copy link'}
      </button>

      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Share on X
      </a>
    </div>
  );
}
