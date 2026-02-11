const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { getHead, getNav, getFooter, esc, citySlug, listingUrl } = require('../templates/shared');

const SB = createClient(
  'https://ingorrzmoudvoknhwjjb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc'
);
const MEDIA_BASE = 'https://ingorrzmoudvoknhwjjb.supabase.co/storage/v1/object/public/placeholders/';

function mediaUrl(p) { return MEDIA_BASE + encodeURIComponent(p); }

function stateName(abbr) {
  const m = { 'AL':'Alabama','AK':'Alaska','AZ':'Arizona','AR':'Arkansas','CA':'California','CO':'Colorado','CT':'Connecticut','DE':'Delaware','FL':'Florida','GA':'Georgia','HI':'Hawaii','ID':'Idaho','IL':'Illinois','IN':'Indiana','IA':'Iowa','KS':'Kansas','KY':'Kentucky','LA':'Louisiana','ME':'Maine','MD':'Maryland','MA':'Massachusetts','MI':'Michigan','MN':'Minnesota','MS':'Mississippi','MO':'Missouri','MT':'Montana','NE':'Nebraska','NV':'Nevada','NH':'New Hampshire','NJ':'New Jersey','NM':'New Mexico','NY':'New York','NC':'North Carolina','ND':'North Dakota','OH':'Ohio','OK':'Oklahoma','OR':'Oregon','PA':'Pennsylvania','RI':'Rhode Island','SC':'South Carolina','SD':'South Dakota','TN':'Tennessee','TX':'Texas','UT':'Utah','VT':'Vermont','VA':'Virginia','WA':'Washington','WV':'West Virginia','WI':'Wisconsin','WY':'Wyoming','DC':'District of Columbia' };
  return m[abbr.toUpperCase()] || abbr;
}

function dist(lat1, lng1, lat2, lng2) {
  const R = 3959, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function renderCard(l, media) {
  const ini = l.name.split(' ').map(w => w[0]).slice(0, 2).join('');
  const pr = l.price_range || '$$';
  const svcs = (l.services || []).slice(0, 4).map(s => `<span class="c-tag">${esc(s)}</span>`).join('');
  const url = listingUrl(l);
  let thumb = '';
  if (media && media.length) {
    const m = media[0];
    thumb = `<div class="c-img"><img src="${mediaUrl(m.storage_path)}" loading="lazy" width="400" height="180" alt="${esc(l.name)} SMP">${m.is_placeholder ? '<span class="c-pill">\ud83d\udcf7 Sample photo</span>' : ''}</div>`;
  }
  return `<a class="card" href="${url}" itemscope itemtype="https://schema.org/LocalBusiness">
      ${thumb}
      <div class="c-head"><div class="c-av">${ini}</div><div class="c-info"><div class="c-name" itemprop="name">${esc(l.name)}</div><div class="c-loc"><span itemprop="address">${esc(l.city)}, ${esc(l.state)}</span></div></div><div class="c-pr">${esc(pr)}</div></div>
      <div class="c-body"><p class="c-about" itemprop="description">${esc(l.about)}</p></div>
      <div class="c-tags">${svcs}</div>
    </a>`;
}

function renderPage(city, state, listings, allCities, mediaMap) {
  const cs = citySlug(city, state);
  const sn = stateName(state);
  const count = listings.length;
  const plural = count === 1 ? 'artist' : 'artists';
  const title = `Hair Tattoo & SMP Artists in ${city}, ${state} | HairTattoo.com`;
  const desc = `Find ${count} verified scalp micropigmentation and hair tattoo ${plural} in ${city}, ${sn}. Compare services, pricing, and contact SMP professionals near you.`;
  const canonical = `https://hairtattoo.com/near-me/${cs}/`;

  const cards = listings.map(l => renderCard(l, mediaMap[l.id])).join('\n');

  // Nearby cities sorted by distance
  const refLat = listings[0].lat, refLng = listings[0].lng;
  const nearby = allCities
    .filter(c => !(c.city === city && c.state === state))
    .map(c => { c._d = dist(refLat, refLng, c.lat, c.lng); return c; })
    .sort((a, b) => a._d - b._d)
    .slice(0, 12);
  const nearbyHTML = nearby.map(c =>
    `<a href="/near-me/${citySlug(c.city, c.state)}/">${c.city}, ${c.state} <span>(${c.count})</span></a>`
  ).join('');

  // Schema.org
  const schemas = listings.map(l =>
    `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org', '@type': 'LocalBusiness', 'name': l.name,
      'address': { '@type': 'PostalAddress', 'streetAddress': l.address, 'addressLocality': l.city, 'addressRegion': l.state, 'postalCode': l.zip, 'addressCountry': 'US' },
      'telephone': l.phone, 'email': l.email, 'url': l.website, 'description': l.about,
      'geo': { '@type': 'GeoCoordinates', 'latitude': l.lat, 'longitude': l.lng },
      'makesOffer': (l.services || []).map(s => ({ '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': s } }))
    })}<\/script>`
  ).join('\n');

  const webPageSchema = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebPage',
    'name': title, 'description': desc,
    'url': canonical,
    'isPartOf': { '@type': 'WebSite', 'name': 'HairTattoo', 'url': 'https://hairtattoo.com' }
  })}<\/script>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
${getHead(title, desc, canonical)}
${schemas}
${webPageSchema}
</head>
<body>
${getNav()}
<div class="breadcrumb"><a href="/">HairTattoo</a> \u203a <a href="/near-me/">Near Me</a> \u203a ${esc(city)}, ${esc(state)}</div>
<section class="hero">
  <h1><em>Hair Tattoo</em> Artists in ${esc(city)}, ${esc(state)}</h1>
  <p>Browse verified scalp micropigmentation professionals in ${esc(city)}, ${esc(sn)}. Compare services, view pricing, and connect with SMP artists near you.</p>
  <div class="count">${count} SMP ${plural} found</div>
</section>
<div class="main"><div class="grid">${cards}</div></div>
${nearbyHTML ? `<div class="nearby">
    <h3>SMP Artists in Nearby Cities</h3>
    <div class="nearby-links">${nearbyHTML}</div>
  </div>` : ''}
<div class="cta"><div class="cta-box">
  <h3>SMP Professional in ${esc(city)}?</h3>
  <p>List your business for free and start getting leads from local clients.</p>
  <a href="/signup.html" class="btn">List Your Business \u2192</a>
</div></div>
${getFooter()}
</body>
</html>`;
}

async function main() {
  console.log('Fetching listings...');
  const { data: listings, error } = await SB.from('listings').select('*');
  if (error) { console.error('Failed:', error.message); process.exit(1); }
  console.log(`Got ${listings.length} listings`);

  console.log('Fetching media...');
  const { data: media } = await SB.from('media').select('*').order('sort_order', { ascending: true });
  const mediaMap = {};
  if (media) { media.forEach(m => { if (!mediaMap[m.listing_id]) mediaMap[m.listing_id] = []; mediaMap[m.listing_id].push(m); }); }
  console.log(`Got ${media ? media.length : 0} media items`);

  // Group by city+state
  const groups = {};
  listings.forEach(l => {
    const key = l.city + '|' + l.state;
    if (!groups[key]) groups[key] = [];
    groups[key].push(l);
  });

  const allCities = Object.keys(groups).map(key => {
    const [city, state] = key.split('|');
    const items = groups[key];
    return { city, state, count: items.length, lat: items[0].lat, lng: items[0].lng };
  });

  const nearMeDir = path.join(__dirname, '..', 'near-me');
  let generated = 0;

  // Generate Near Me index page
  generateNearMeIndex(nearMeDir, allCities, listings.length);

  Object.keys(groups).forEach(key => {
    const [city, state] = key.split('|');
    const items = groups[key];
    const cs = citySlug(city, state);
    const dir = path.join(nearMeDir, cs);

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const html = renderPage(city, state, items, allCities, mediaMap);
    fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
    generated++;
  });

  console.log(`Generated ${generated} city pages`);
}

function generateNearMeIndex(nearMeDir, allCities, totalListings) {
  const sorted = [...allCities].sort((a, b) => b.count - a.count);
  const title = 'Find SMP & Hair Tattoo Artists Near You | HairTattoo.com';
  const desc = `Browse ${totalListings} scalp micropigmentation professionals across ${allCities.length} cities in the United States.`;
  const canonical = 'https://hairtattoo.com/near-me/';

  const cityLinks = sorted.map(c =>
    `<a href="/near-me/${citySlug(c.city, c.state)}/" class="city-card"><span class="city-name">${esc(c.city)}, ${esc(c.state)}</span><span class="city-count">${c.count} artist${c.count !== 1 ? 's' : ''}</span></a>`
  ).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${getHead(title, desc, canonical)}
</head>
<body>
${getNav()}
<div class="breadcrumb"><a href="/">HairTattoo</a> \u203a Near Me</div>
<section class="hero">
  <h1>Find <em>Hair Tattoo</em> Artists Near You</h1>
  <p>Browse ${totalListings} verified scalp micropigmentation professionals across ${allCities.length} cities in the United States.</p>
</section>
<div class="main"><div class="city-grid">
    ${cityLinks}
</div></div>
${getFooter()}
</body>
</html>`;

  if (!fs.existsSync(nearMeDir)) fs.mkdirSync(nearMeDir, { recursive: true });
  fs.writeFileSync(path.join(nearMeDir, 'index.html'), html, 'utf8');
  console.log('Generated Near Me index page');
}

main().catch(e => { console.error(e); process.exit(1); });
