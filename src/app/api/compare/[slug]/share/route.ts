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
    .select('id')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await supabase.rpc('increment_share_count', { comparison_id: data.id });

  return NextResponse.json({ ok: true });
}
