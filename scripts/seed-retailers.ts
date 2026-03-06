import { createClient } from '../src/lib/supabase';
import { SEED_RETAILERS } from '../src/config/retailers';

async function seedRetailers() {
  const supabase = createClient();

  console.log('Seeding retailers...');

  const { data, error } = await supabase
    .from('retailers')
    .upsert(SEED_RETAILERS, { onConflict: 'slug' })
    .select();

  if (error) {
    console.error('Error seeding retailers:', error);
    process.exit(1);
  }

  console.log(`Seeded ${data?.length ?? 0} retailers`);
  data?.forEach((r) => console.log(`  - ${r.name} (${r.slug})`));
}

seedRetailers().catch(console.error);
