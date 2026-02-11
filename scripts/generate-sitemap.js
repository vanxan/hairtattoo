const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SB = createClient(
  'https://ingorrzmoudvoknhwjjb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc'
);

function citySlug(city, state) {
  return city.toLowerCase().replace(/\s+/g, '-') + '-' + state.toLowerCase();
}

async function main() {
  const { data: listings, error } = await SB.from('listings').select('slug,city,state');
  if (error) { console.error('Failed:', error.message); process.exit(1); }

  const today = new Date().toISOString().slice(0, 10);
  const urls = [];

  // Main page
  urls.push({ loc: 'https://hairtattoo.com/', priority: '1.0', changefreq: 'daily' });

  // Near Me index
  urls.push({ loc: 'https://hairtattoo.com/near-me/', priority: '0.9', changefreq: 'weekly' });

  // Signup
  urls.push({ loc: 'https://hairtattoo.com/signup.html', priority: '0.7', changefreq: 'monthly' });

  // City pages
  const cities = new Set();
  listings.forEach(l => cities.add(citySlug(l.city, l.state)));
  for (const cs of cities) {
    urls.push({ loc: `https://hairtattoo.com/near-me/${cs}/`, priority: '0.8', changefreq: 'weekly' });
  }

  // Individual listing pages
  listings.forEach(l => {
    const cs = citySlug(l.city, l.state);
    urls.push({ loc: `https://hairtattoo.com/near-me/${cs}/${l.slug}`, priority: '0.7', changefreq: 'weekly' });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(__dirname, '..', 'sitemap.xml'), xml, 'utf8');
  console.log(`Generated sitemap.xml with ${urls.length} URLs (${cities.size} cities, ${listings.length} listings)`);
}

main().catch(e => { console.error(e); process.exit(1); });
