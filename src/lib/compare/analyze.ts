import { openai } from '@/lib/openai';
import { ValueAnalysisSchema, type Product, type SimilarProduct, type ValueAnalysis } from '@/lib/types';

const ANALYZE_SYSTEM = `You are an expert furniture value analyst. Given a source product and a list of alternatives, assess whether the source product is worth its price compared to the alternatives.

Return a JSON object with:
- value_score: integer 1-100 (100 = exceptional value, 50 = fair, 1 = poor value)
- verdict: string (1-2 sentence plain-language verdict, e.g. "This sofa is overpriced for what you get. You can find nearly identical quality for 30% less.")
- strengths: array of 2-4 strings (what the source product does well)
- weaknesses: array of 1-3 strings (what it lacks or where it's overpriced)
- comparison_notes: object mapping alternative product id to a 1-sentence note about how it compares (e.g. "Similar materials at $200 less")

Be concise and direct. No markdown in string values.`;

interface AnalyzeInput {
  source: Pick<Product, 'name' | 'brand' | 'price' | 'description' | 'materials' | 'style_tags' | 'category'>;
  alternatives: (SimilarProduct & { name?: string; brand?: string | null; category?: string })[];
}

export async function generateValueAnalysis(
  source: AnalyzeInput['source'],
  alternatives: AnalyzeInput['alternatives']
): Promise<ValueAnalysis> {
  const sourceDesc = formatProductForGpt(source);
  const altDescs = alternatives
    .map((a, i) => `Alternative ${i + 1} (id: ${a.id}):\n${formatAltForGpt(a)}`)
    .join('\n\n');

  const userContent = `Source product:\n${sourceDesc}\n\nAlternatives:\n${altDescs}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: ANALYZE_SYSTEM },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 768,
  });

  const raw = response.choices[0]?.message?.content ?? '{}';

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`GPT returned invalid JSON for value analysis`);
  }

  const result = ValueAnalysisSchema.safeParse(parsed);
  if (!result.success) {
    // Try to recover with partial data
    const partial = parsed as Record<string, unknown>;
    return {
      value_score: typeof partial.value_score === 'number' ? Math.min(100, Math.max(1, Math.round(partial.value_score))) : 50,
      verdict: typeof partial.verdict === 'string' ? partial.verdict : 'Unable to determine value.',
      strengths: Array.isArray(partial.strengths) ? partial.strengths as string[] : [],
      weaknesses: Array.isArray(partial.weaknesses) ? partial.weaknesses as string[] : [],
      comparison_notes: (typeof partial.comparison_notes === 'object' && partial.comparison_notes !== null)
        ? partial.comparison_notes as Record<string, string>
        : {},
    };
  }

  return result.data;
}

function formatProductForGpt(
  p: Pick<Product, 'name' | 'brand' | 'price' | 'description' | 'materials' | 'style_tags' | 'category'>
): string {
  const lines = [
    `Name: ${p.name}`,
    p.brand ? `Brand: ${p.brand}` : null,
    p.category ? `Category: ${p.category}` : null,
    p.price != null ? `Price: $${p.price}` : null,
    p.materials?.length ? `Materials: ${p.materials.join(', ')}` : null,
    p.style_tags?.length ? `Style: ${p.style_tags.join(', ')}` : null,
    p.description ? `Description: ${p.description.slice(0, 200)}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

function formatAltForGpt(a: SimilarProduct & { name?: string; brand?: string | null }): string {
  const lines = [
    a.name ? `Name: ${a.name}` : null,
    a.brand ? `Brand: ${a.brand}` : null,
    a.price != null ? `Price: $${a.price}` : null,
    `Similarity score: ${(a.similarity_score * 100).toFixed(0)}%`,
  ].filter(Boolean);
  return lines.join('\n');
}
