#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// --- Config ---
const SUPABASE_URL = 'https://ingorrzmoudvoknhwjjb.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BATCH_SIZE = 50;

if (!SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_ANON_KEY environment variable.');
  console.error('Usage: SUPABASE_ANON_KEY=your-key node scripts/import-listings.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Extract listings from index.html ---
function extractListings() {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const match = html.match(/const L=(\[.*?\]);/s);
  if (!match) {
    console.error('Could not find "const L=[...]" in index.html');
    process.exit(1);
  }
  return JSON.parse(match[1]);
}

// --- Transform listing to match schema.sql ---
function transform(listing) {
  const socials = listing.socials || {};
  return {
    name: listing.name,
    slug: listing.slug,
    city: listing.city,
    state: listing.state,
    address: listing.address || null,
    zip: listing.zip || null,
    phone: listing.phone || null,
    email: listing.email || null,
    website: listing.website || null,
    lat: listing.lat || null,
    lng: listing.lng || null,
    services: listing.services || [],
    price_range: listing.pr || listing.priceRange || '$',
    about: listing.about || null,
    claimed: listing.claimed || false,
    instagram: socials.instagram || null,
    facebook: socials.facebook || null,
    tiktok: socials.tiktok || null,
  };
}

// --- Insert in batches ---
async function importListings() {
  const raw = extractListings();
  console.log(`Extracted ${raw.length} listings from index.html\n`);

  // Deduplicate by slug (keep last occurrence)
  const seen = new Map();
  raw.forEach(l => seen.set(l.slug, l));
  const unique = [...seen.values()];
  console.log(`Deduplicated: ${raw.length} → ${unique.length} unique slugs\n`);

  const rows = unique.map(transform);
  let success = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

    const { data, error } = await supabase
      .from('listings')
      .upsert(batch, { onConflict: 'slug' })
      .select('id');

    if (error) {
      console.error(`  Batch ${batchNum}/${totalBatches}: FAILED — ${error.message}`);
      failed += batch.length;
      errors.push({ batch: batchNum, error: error.message });
    } else {
      console.log(`  Batch ${batchNum}/${totalBatches}: OK — ${data.length} rows upserted`);
      success += data.length;
    }
  }

  console.log('\n--- Results ---');
  console.log(`Success: ${success}`);
  console.log(`Failed:  ${failed}`);
  if (errors.length) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  Batch ${e.batch}: ${e.error}`));
  }
}

importListings().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
