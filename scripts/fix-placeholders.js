const { createClient } = require('@supabase/supabase-js');

const SB = createClient(
  'https://ingorrzmoudvoknhwjjb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc'
);

// Real files that exist in the placeholders bucket
const REAL_PLACEHOLDERS = [
  'istockphoto-1359870624-612x612.jpg',
  'istockphoto-1455517622-612x612.jpg',
  'istockphoto-182490968-612x612.jpg',
  'istockphoto-932724850-612x612.jpg',
  'istockphoto-639042482-612x612.jpg',
  'istockphoto-689527776-612x612.jpg',
  'istockphoto-2205354064-612x612.jpg',
  'istockphoto-2147622228-612x612.jpg',
  'istockphoto-1198745727-612x612.jpg',
  'istockphoto-1359870647-612x612.jpg',
  'istockphoto-1459309841-612x612.jpg',
  'istockphoto-2166038987-612x612.jpg',
  'IMG_6822-1.webp',
  'Scar_Camouflage_with_Scalp_Micropigmentation_59e317b3-e53d-4a16-aa5e-07b7c6db6d36.webp',
  'Scar-camouflage-scalp-micropigmentation-hairline-miami-los-angeles-chicago-nyc-411x260.webp',
  'thinning_34.webp',
  'hair-density-smp-women-on-point-los-angeles.webp',
  'shutterstock_624234890.jpg',
  'Scalp-Micropigmentation.png',
  'Scalp_1-1296x728-Header.webp',
  '2.webp',
  'Beard-Enhancement-1.webp',
  'confbeards.webp',
  'foliculescalpmicropigmentation_1080x1080_782d3226-9685-4f71-a5c9-6ba4f3a37978_800x.webp'
];

async function main() {
  // Step 1: Delete all smp-placeholder-* rows (these point to non-existent files)
  console.log('Step 1: Deleting broken smp-placeholder-* media rows...');
  const { data: broken, error: delErr } = await SB.from('media')
    .delete()
    .like('storage_path', 'smp-placeholder%')
    .select('id');

  if (delErr) {
    console.error('Delete error:', delErr.message);
    return;
  }
  console.log(`Deleted ${broken ? broken.length : 0} broken placeholder rows`);

  // Step 2: Find listings that now have NO media at all
  console.log('\nStep 2: Finding listings without any media...');
  const { data: allListings } = await SB.from('listings').select('id, name');
  const { data: allMedia } = await SB.from('media').select('listing_id');
  const listingsWithMedia = new Set((allMedia || []).map(m => m.listing_id));

  const bare = (allListings || []).filter(l => !listingsWithMedia.has(l.id));
  console.log(`${bare.length} listings have no media`);

  // Step 3: Re-seed with real placeholder filenames
  if (bare.length) {
    console.log('\nStep 3: Seeding real placeholders...');
    let seeded = 0;
    for (const listing of bare) {
      const shuffled = [...REAL_PLACEHOLDERS].sort(() => Math.random() - 0.5);
      const picks = shuffled.slice(0, 3);
      const rows = picks.map((p, idx) => ({
        listing_id: listing.id,
        storage_path: p,
        type: 'image',
        is_placeholder: true,
        sort_order: idx
      }));
      const { error } = await SB.from('media').insert(rows);
      if (error) console.error(`  Error for ${listing.name}: ${error.message}`);
      else seeded++;
    }
    console.log(`Seeded ${seeded} listings with real placeholders`);
  }

  // Step 4: Verify
  const { count } = await SB.from('media').select('*', { count: 'exact', head: true });
  const { data: check } = await SB.from('media').select('id').like('storage_path', 'smp-placeholder%');
  console.log(`\nVerification: ${count} total media rows, ${check ? check.length : 0} smp-placeholder rows remaining`);
}

main().catch(e => { console.error(e); process.exit(1); });
