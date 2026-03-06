import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createClient();

  const { data, error } = await supabase
    .from('comparisons')
    .select('id, share_count')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await supabase
    .from('comparisons')
    .update({ share_count: (data.share_count ?? 0) + 1 })
    .eq('id', data.id);

  return NextResponse.json({ ok: true });
}
