import type { Dimensions } from '@/lib/types';
import { formatPrice } from '@/lib/format';

// Minimal product shape needed for the spec table
type SpecProduct = {
  id?: string;
  name: string;
  brand?: string | null;
  price?: number | null;
  dimensions?: Dimensions | null;
  materials?: string[];
  style_tags?: string[];
  rating?: number | null;
  review_count?: number | null;
};

interface SpecTableProps {
  source: SpecProduct;
  alternatives: (SpecProduct & { similarity_score?: number })[];
}

function formatDimensions(product: SpecProduct): string {
  const d = product.dimensions;
  if (!d) return '—';
  const parts = [
    d.width != null ? `${d.width}W` : null,
    d.height != null ? `${d.height}H` : null,
    d.depth != null ? `${d.depth}D` : null,
  ].filter(Boolean);
  return parts.length ? `${parts.join(' × ')} ${d.unit}` : '—';
}

interface SpecRow {
  label: string;
  getValue: (p: SpecProduct) => string;
}

const SPEC_ROWS: SpecRow[] = [
  { label: 'Price', getValue: (p) => formatPrice(p.price) },
  { label: 'Brand', getValue: (p) => p.brand ?? '—' },
  { label: 'Dimensions', getValue: formatDimensions },
  { label: 'Materials', getValue: (p) => p.materials?.join(', ') || '—' },
  { label: 'Style', getValue: (p) => p.style_tags?.join(', ') || '—' },
  { label: 'Rating', getValue: (p) => p.rating != null ? `${p.rating}/5 (${p.review_count ?? 0} reviews)` : '—' },
];

export function SpecTable({ source, alternatives }: SpecTableProps) {
  const allProducts = [source, ...alternatives.slice(0, 3)];

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[500px] text-sm">
        <thead>
          <tr>
            <th className="w-28 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-400" />
            <th className="px-3 py-3 text-left font-semibold text-zinc-900 dark:text-zinc-50">
              <div className="flex items-center gap-1">
                {source.name.slice(0, 30)}{source.name.length > 30 ? '…' : ''}
                <span className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">
                  You&apos;re looking at
                </span>
              </div>
            </th>
            {alternatives.slice(0, 3).map((alt) => (
              <th
                key={alt.id}
                className="px-3 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300"
              >
                {alt.name.slice(0, 30)}{alt.name.length > 30 ? '…' : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SPEC_ROWS.map((row, rowIdx) => (
            <tr
              key={row.label}
              className={rowIdx % 2 === 0 ? 'bg-zinc-50 dark:bg-zinc-800/50' : ''}
            >
              <td className="py-2.5 pr-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {row.label}
              </td>
              {allProducts.map((product, colIdx) => (
                <td
                  key={product.id ?? colIdx}
                  className={`px-3 py-2.5 text-zinc-800 dark:text-zinc-200 ${
                    colIdx === 0 ? 'font-medium' : ''
                  }`}
                >
                  {row.getValue(product)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
