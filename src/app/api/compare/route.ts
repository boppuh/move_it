import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runComparison } from '@/lib/compare/pipeline';

const CompareRequestSchema = z.object({
  url: z.string().url().optional(),
  text: z.string().min(3).optional(),
}).refine((d) => d.url || d.text, {
  message: 'Either url or text is required',
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = CompareRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await runComparison(parsed.data);
    return NextResponse.json({
      slug: result.slug,
      url: `/compare/${result.slug}`,
      comparison: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Comparison failed';
    console.error('[api/compare] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
