import { openai } from '@/lib/openai';
import { Dimensions } from '@/lib/types';

const STYLE_OPTIONS = [
  'mid-century',
  'modern',
  'traditional',
  'scandinavian',
  'industrial',
  'farmhouse',
  'glam',
  'bohemian',
  'coastal',
] as const;

// ─── Dimension Parsing ────────────────────────────────────────────────────────

type DimKey = 'width' | 'height' | 'depth';

// Each entry: [pattern, heightGroup, widthGroup, depthGroup]
// Group indices refer to capture groups in the regex (1-based)
const STRUCTURED_PATTERNS: [RegExp, number, number, number][] = [
  // e.g. "39.4"H x 82.3"W x 87.4"D" — height first
  [/(\d+\.?\d*)\s*["″]?\s*H\s*[x×]\s*(\d+\.?\d*)\s*["″]?\s*W(?:\s*[x×]\s*(\d+\.?\d*)\s*["″]?\s*D)?/i, 1, 2, 3],
  // e.g. "82.3"W x 39.4"H x 87.4"D" — width first
  [/(\d+\.?\d*)\s*["″]?\s*W\s*[x×]\s*(\d+\.?\d*)\s*["″]?\s*H(?:\s*[x×]\s*(\d+\.?\d*)\s*["″]?\s*D)?/i, 2, 1, 3],
  // e.g. "W39 x H82 x D87"
  [/W\s*(\d+\.?\d*)\s*[x×]\s*H\s*(\d+\.?\d*)(?:\s*[x×]\s*D\s*(\d+\.?\d*))?/i, 2, 1, 3],
  // e.g. "39W x 82H x 87D"
  [/(\d+\.?\d*)\s*W\s*[x×]\s*(\d+\.?\d*)\s*H(?:\s*[x×]\s*(\d+\.?\d*)\s*D)?/i, 2, 1, 3],
];

const LABEL_PATTERN =
  /(width|w|height|h|depth|d|length|l)\s*[:\-]?\s*(\d+\.?\d*)\s*("|in|inch|inches|cm|centimeter|centimeters)?/gi;

export function parseDimensions(raw: string): Dimensions | null {
  if (!raw) return null;

  const unit: 'in' | 'cm' = /cm|centimeter/i.test(raw) ? 'cm' : 'in';

  // Try structured patterns first (e.g. "39.4"H x 82.3"W x 87.4"D")
  for (const [pattern, hGroup, wGroup, dGroup] of STRUCTURED_PATTERNS) {
    const m = pattern.exec(raw);
    if (m) {
      const height = parseFloat(m[hGroup]);
      const width = parseFloat(m[wGroup]);
      const depthRaw = m[dGroup];
      const depth = depthRaw ? parseFloat(depthRaw) : undefined;

      if (isNaN(height) || isNaN(width)) continue;

      return {
        height,
        width,
        depth: depth && !isNaN(depth) ? depth : undefined,
        unit,
      };
    }
  }

  // Try label-based parsing (e.g. "Height: 100cm, Width: 209cm")
  const dims: Partial<Record<DimKey, number>> = {};
  let labelMatch: RegExpExecArray | null;

  while ((labelMatch = LABEL_PATTERN.exec(raw)) !== null) {
    const label = labelMatch[1].toLowerCase();
    const value = parseFloat(labelMatch[2]);
    if (isNaN(value)) continue;

    if (label === 'h' || label === 'height') dims.height = value;
    else if (label === 'w' || label === 'width') dims.width = value;
    else if (label === 'd' || label === 'depth' || label === 'l' || label === 'length') dims.depth = value;
  }

  if (dims.height && dims.width) {
    return { height: dims.height, width: dims.width, depth: dims.depth, unit };
  }

  return null;
}

// ─── Materials Extraction (GPT) ───────────────────────────────────────────────

const COMMON_MATERIALS = [
  'solid wood', 'engineered wood', 'mdf', 'plywood', 'particleboard',
  'metal', 'steel', 'iron', 'aluminum', 'brass', 'gold',
  'fabric', 'linen', 'velvet', 'polyester', 'cotton', 'leather', 'faux leather',
  'foam', 'memory foam', 'down', 'fiberfill',
  'marble', 'glass', 'ceramic', 'rattan', 'wicker', 'bamboo',
  'plastic', 'acrylic',
];

export async function extractMaterials(description: string): Promise<string[]> {
  // Fast path: check for common materials mentioned directly
  const lower = description.toLowerCase();
  const found = COMMON_MATERIALS.filter((m) => lower.includes(m));
  if (found.length >= 1) return found;

  // Fall back to GPT-4o-mini
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Extract the primary construction materials from this furniture product description. Return a JSON array of lowercase strings (e.g. ["solid wood", "polyester"]). Maximum 5 items. If no materials are mentioned, return [].',
        },
        { role: 'user', content: description.slice(0, 500) },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 100,
    });

    const content = response.choices[0]?.message?.content ?? '{"materials":[]}';
    const parsed = JSON.parse(content) as { materials?: unknown };
    const materials = parsed.materials;

    if (Array.isArray(materials)) {
      return materials.filter((m): m is string => typeof m === 'string').slice(0, 5);
    }
  } catch {
    // Return empty array on failure — non-fatal
  }

  return [];
}

// ─── Style Tag Inference (GPT) ────────────────────────────────────────────────

export async function inferStyleTags(name: string, description: string): Promise<string[]> {
  const text = `${name}. ${description}`.slice(0, 600);
  const lower = text.toLowerCase();

  // Fast path: keyword matching
  const fast: string[] = [];
  const keywords: Record<string, string[]> = {
    'mid-century': ['mid-century', 'mid century', 'midcentury', 'danish modern', 'retro'],
    'modern': ['modern', 'contemporary', 'minimalist', 'sleek', 'clean lines'],
    'traditional': ['traditional', 'classic', 'ornate', 'antique', 'victorian', 'baroque'],
    'scandinavian': ['scandinavian', 'nordic', 'hygge', 'scandi'],
    'industrial': ['industrial', 'reclaimed', 'raw', 'factory', 'pipe', 'exposed'],
    'farmhouse': ['farmhouse', 'rustic', 'shiplap', 'distressed', 'barn'],
    'glam': ['glam', 'glamour', 'luxe', 'crystal', 'mirrored', 'velvet', 'tufted', 'gold'],
    'bohemian': ['bohemian', 'boho', 'eclectic', 'global', 'handwoven', 'macramé'],
    'coastal': ['coastal', 'beach', 'nautical', 'ocean', 'seaside', 'driftwood'],
  };

  for (const [tag, terms] of Object.entries(keywords)) {
    if (terms.some((t) => lower.includes(t))) fast.push(tag);
  }

  if (fast.length > 0) return fast.slice(0, 3);

  // Fall back to GPT-4o-mini
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Classify this furniture item's design style. Choose 1-3 tags from this list only: ${STYLE_OPTIONS.join(', ')}. Return a JSON object with a "tags" array.`,
        },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 60,
    });

    const content = response.choices[0]?.message?.content ?? '{"tags":[]}';
    const parsed = JSON.parse(content) as { tags?: unknown };
    const tags = parsed.tags;

    if (Array.isArray(tags)) {
      return tags
        .filter((t): t is string => typeof t === 'string' && (STYLE_OPTIONS as readonly string[]).includes(t))
        .slice(0, 3);
    }
  } catch {
    // Return empty array on failure — non-fatal
  }

  return ['modern'];
}
