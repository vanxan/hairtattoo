const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { getHead, getNav, getFooter, esc, citySlug, listingUrl, getBadge } = require('../templates/shared');

const SB = createClient(
  'https://ingorrzmoudvoknhwjjb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc'
);
const SB_STORAGE = 'https://ingorrzmoudvoknhwjjb.supabase.co/storage/v1/object/public/';

function mediaUrl(m) {
  const bucket = m.is_placeholder ? 'placeholders' : 'media';
  return SB_STORAGE + bucket + '/' + m.storage_path;
}

function stateName(abbr) {
  const m = { 'AL':'Alabama','AK':'Alaska','AZ':'Arizona','AR':'Arkansas','CA':'California','CO':'Colorado','CT':'Connecticut','DE':'Delaware','FL':'Florida','GA':'Georgia','HI':'Hawaii','ID':'Idaho','IL':'Illinois','IN':'Indiana','IA':'Iowa','KS':'Kansas','KY':'Kentucky','LA':'Louisiana','ME':'Maine','MD':'Maryland','MA':'Massachusetts','MI':'Michigan','MN':'Minnesota','MS':'Mississippi','MO':'Missouri','MT':'Montana','NE':'Nebraska','NV':'Nevada','NH':'New Hampshire','NJ':'New Jersey','NM':'New Mexico','NY':'New York','NC':'North Carolina','ND':'North Dakota','OH':'Ohio','OK':'Oklahoma','OR':'Oregon','PA':'Pennsylvania','RI':'Rhode Island','SC':'South Carolina','SD':'South Dakota','TN':'Tennessee','TX':'Texas','UT':'Utah','VT':'Vermont','VA':'Virginia','WA':'Washington','WV':'West Virginia','WI':'Wisconsin','WY':'Wyoming','DC':'District of Columbia' };
  return m[abbr.toUpperCase()] || abbr;
}

function dist(lat1, lng1, lat2, lng2) {
  const R = 3959, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function renderCard(l, media, viewCount, opts) {
  opts = opts || {};
  const ini = l.name.split(' ').map(w => w[0]).slice(0, 2).join('');
  const profilePhoto = media && media.find(m => m.is_profile);
  const avHTML = profilePhoto
    ? `<img src="${mediaUrl(profilePhoto)}" alt="${esc(l.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : ini;
  const badge = getBadge(l, media);
  const svcs = (l.services || []).slice(0, 3).map(s => `<span class="c-tag">${esc(s)}</span>`).join('');
  const url = listingUrl(l);
  let thumb = '';
  if (opts.featured && media && media.length) {
    const m = media.find(x => x.is_cover) || media.find(x => !x.is_profile && !x.is_cover && !x.is_placeholder && x.type !== 'video') || media.find(x => !x.is_profile && !x.is_cover);
    if (m) {
      const src = mediaUrl(m);
      thumb = `<div class="c-img"><span class="c-featured-pill">\u2B50 Featured</span><img src="${src}" loading="lazy" width="400" height="180" alt="${esc(l.name)} SMP">${m.is_placeholder ? '<span class="c-pill">\ud83d\udcf7 Sample photo</span>' : ''}</div>`;
    }
  }
  const viewsLabel = viewCount ? `\ud83d\udc41 ${viewCount} view${viewCount !== 1 ? 's' : ''}` : 'New';
  return `<a class="card" href="${url}" title="${esc(l.name)} - SMP in ${esc(l.city)}, ${esc(l.state)}" itemscope itemtype="https://schema.org/LocalBusiness">
      ${thumb}
      <div class="c-head"><div class="c-av">${avHTML}</div><div class="c-info"><div class="c-name" itemprop="name">${esc(l.name)}</div><div class="c-loc"><svg style="width:12px;height:12px;vertical-align:middle;fill:none;stroke:currentColor;stroke-width:2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> <span itemprop="address">${esc(l.city)}, ${esc(l.state)}</span></div></div>${badge}</div>
      <div class="c-body"><p class="c-about" itemprop="description">${esc(l.about)}</p></div>
      <div class="c-tags">${svcs}</div>
      <div class="c-foot"><span class="c-views">${viewsLabel}</span><span class="c-msg" onclick="event.preventDefault();event.stopPropagation();openMsgPanel(${l.id})"><svg style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;vertical-align:middle" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Message</span></div>
    </a>`;
}

function renderPage(city, state, listings, allCities, mediaMap, viewMap) {
  const cs = citySlug(city, state);
  const sn = stateName(state);
  const count = listings.length;
  const plural = count === 1 ? 'artist' : 'artists';
  const title = `SMP Artists in ${city}, ${state} | Hair Tattoo`;
  const desc = `Find ${count} verified scalp micropigmentation ${plural} in ${city}, ${sn}. Compare services, view portfolios, and contact SMP professionals near you.`;
  const canonical = `https://hairtattoo.com/near-me/${cs}/`;

  const now = new Date().toISOString();
  const promoted = listings.filter(l => l.promoted && l.promoted_until && l.promoted_until > now);
  const featuredHTML = promoted.length ? `<div class="featured-section">
  <h2>Featured in ${esc(city)}</h2>
  <div class="featured-row">${promoted.map(l => renderCard(l, mediaMap[l.id], viewMap[l.id], { featured: true })).join('\n')}</div>
</div>` : '';

  const cards = listings.map(l => renderCard(l, mediaMap[l.id], viewMap[l.id])).join('\n');

  // Nearby cities sorted by distance
  const refLat = listings[0].lat, refLng = listings[0].lng;
  const nearby = allCities
    .filter(c => !(c.city === city && c.state === state))
    .map(c => { c._d = dist(refLat, refLng, c.lat, c.lng); return c; })
    .sort((a, b) => a._d - b._d)
    .slice(0, 12);
  const nearbyHTML = nearby.map(c =>
    `<a href="/near-me/${citySlug(c.city, c.state)}/" title="SMP artists in ${c.city}, ${c.state}">${c.city}, ${c.state} <span>(${c.count})</span></a>`
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
    'isPartOf': { '@type': 'WebSite', 'name': 'Hair Tattoo', 'url': 'https://hairtattoo.com' }
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
<div class="breadcrumb"><a href="/" title="Hair Tattoo - SMP Artist Directory">Hair Tattoo</a> \u203a <a href="/near-me/" title="Find SMP artists near you">Near Me</a> \u203a ${esc(city)}, ${esc(state)}</div>
<section class="hero">
  <h1><em>SMP</em> Artists in ${esc(city)}, ${esc(state)}</h1>
  <p>Browse verified scalp micropigmentation professionals in ${esc(city)}, ${esc(sn)}. Compare services, view portfolios, and connect with SMP artists near you.</p>
  <div class="count">${count} SMP ${plural} found</div>
</section>
${featuredHTML}
<div class="main"><div class="grid">${cards}</div></div>
${nearbyHTML ? `<div class="nearby">
    <h3>SMP Artists in Nearby Cities</h3>
    <div class="nearby-links">${nearbyHTML}</div>
  </div>` : ''}
<div class="cta"><div class="cta-box">
  <h3>SMP Professional in ${esc(city)}?</h3>
  <p>List your business for free and start getting leads from local clients.</p>
  <a href="/signup.html" class="btn" title="Create your free SMP artist profile">List Your Business \u2192</a>
</div></div>
<!-- MESSAGE PANEL -->
<div class="msg-overlay" id="msgOverlay" onclick="closeMsgPanel()"></div>
<div class="msg-panel" id="msgPanel">
  <div class="msg-panel-head">
    <h3 id="msgPanelTitle">Send a Message</h3>
    <button onclick="closeMsgPanel()" style="font-size:1.25rem;color:var(--t3);line-height:1">&times;</button>
  </div>
  <div class="msg-panel-body" id="msgPanelBody"></div>
</div>
${getFooter()}
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script>
var SB=supabase.createClient('https://ingorrzmoudvoknhwjjb.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc');
var ML=${JSON.stringify(listings.map(l => ({ id: l.id, name: l.name, services: l.services || [] })))};
var msgListingId=null;
function openMsgPanel(id){
  var l=ML.find(function(x){return x.id===id});if(!l)return;
  msgListingId=id;
  document.getElementById('msgPanelTitle').textContent='Message '+l.name;
  var svcs=l.services.map(function(s){return '<span class="msg-svc" onclick="this.classList.toggle(\\'on\\')">'+s+'</span>'}).join('');
  document.getElementById('msgPanelBody').innerHTML=
    '<label class="mp-label">Your Name</label>'+
    '<input type="text" id="mpName" placeholder="Full name">'+
    '<label class="mp-label">Phone Number</label>'+
    '<input type="tel" id="mpPhone" placeholder="(555) 123-4567">'+
    (svcs?'<label class="mp-label">Services Interested In</label><div class="msg-svcs">'+svcs+'</div>':'')+
    '<label class="mp-label">Message</label>'+
    '<textarea id="mpMsg" placeholder="Hi, I\\'m interested in learning more about your SMP services..."></textarea>'+
    '<label class="msg-consent"><input type="checkbox" id="mpConsent"> I agree to receive SMS/text messages from this business regarding my inquiry. Message &amp; data rates may apply.</label>'+
    '<button class="msg-submit" onclick="submitMsgPanel()">Send Message \\u2192</button>';
  document.getElementById('msgOverlay').classList.add('open');
  document.getElementById('msgPanel').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeMsgPanel(){
  document.getElementById('msgOverlay').classList.remove('open');
  document.getElementById('msgPanel').classList.remove('open');
  document.body.style.overflow='';
  msgListingId=null;
}
async function submitMsgPanel(){
  var name=document.getElementById('mpName').value.trim();
  var phone=document.getElementById('mpPhone').value.trim();
  var msg=document.getElementById('mpMsg').value.trim();
  var svcs=[].slice.call(document.querySelectorAll('.msg-svc.on')).map(function(s){return s.textContent});
  if(!name||!phone){alert('Please enter your name and phone number.');return;}
  var fullMsg=(svcs.length?'Services: '+svcs.join(', ')+'\\n\\n':'')+(msg||'');
  var res=await SB.from('leads').insert({listing_id:msgListingId,sender_name:name,sender_phone:phone,sender_message:fullMsg||null});
  if(res.error){console.error('Lead insert error:',res.error.message);alert('Something went wrong. Please try again.');return;}
  document.getElementById('msgPanelBody').innerHTML='<div class="msg-ok"><h4>\\u2713 Message Sent!</h4><p>The artist will reach out to you shortly.</p><button class="btn btn-o" onclick="closeMsgPanel()">Close</button></div>';
}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMsgPanel()});
</script>
</body>
</html>`;
}

async function main() {
  console.log('Fetching listings...');
  const { data: listings, error } = await SB.from('listings').select('*');
  if (error) { console.error('Failed:', error.message); process.exit(1); }
  console.log(`Got ${listings.length} listings`);

  console.log('Fetching media...');
  let allMedia = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data: batch } = await SB.from('media').select('*').order('sort_order', { ascending: true }).range(from, from + PAGE - 1);
    if (!batch || !batch.length) break;
    allMedia = allMedia.concat(batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  const mediaMap = {};
  allMedia.forEach(m => { if (!mediaMap[m.listing_id]) mediaMap[m.listing_id] = []; mediaMap[m.listing_id].push(m); });
  console.log(`Got ${allMedia.length} media items`);

  console.log('Fetching page views...');
  const { data: views } = await SB.from('page_views').select('listing_id');
  const viewMap = {};
  if (views) { views.forEach(v => { viewMap[v.listing_id] = (viewMap[v.listing_id] || 0) + 1; }); }
  console.log(`Got ${views ? views.length : 0} page views`);

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

    const html = renderPage(city, state, items, allCities, mediaMap, viewMap);
    fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
    generated++;
  });

  console.log(`Generated ${generated} city pages`);
}

function generateNearMeIndex(nearMeDir, allCities, totalListings) {
  const title = 'Find SMP Artists Near You | Hair Tattoo';
  const desc = `Browse ${totalListings} scalp micropigmentation professionals across ${allCities.length} cities in the United States.`;
  const canonical = 'https://hairtattoo.com/near-me/';

  // Group cities by state, sort states alphabetically, cities alphabetically within each state
  const byState = {};
  allCities.forEach(c => {
    const sn = stateName(c.state);
    if (!byState[sn]) byState[sn] = [];
    byState[sn].push(c);
  });
  const stateNames = Object.keys(byState).sort();
  stateNames.forEach(s => byState[s].sort((a, b) => a.city.localeCompare(b.city)));

  const stateGroups = stateNames.map(s => {
    const pills = byState[s].map(c =>
      `<a href="/near-me/${citySlug(c.city, c.state)}/" title="SMP artists in ${esc(c.city)}, ${esc(c.state)}">${esc(c.city)} <span>(${c.count})</span></a>`
    ).join('');
    return `<div class="state-group"><h2>${esc(s)}</h2><div class="city-links">${pills}</div></div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${getHead(title, desc, canonical)}
</head>
<body>
${getNav()}
<div class="breadcrumb"><a href="/" title="Hair Tattoo - SMP Artist Directory">Hair Tattoo</a> \u203a Near Me</div>
<section class="hero">
  <h1>Find an <em>SMP</em> Artist Near You</h1>
  <p>Browse ${totalListings} verified scalp micropigmentation professionals across ${allCities.length} cities in the United States.</p>
</section>
<div class="states">
${stateGroups}
</div>
${getFooter()}
</body>
</html>`;

  if (!fs.existsSync(nearMeDir)) fs.mkdirSync(nearMeDir, { recursive: true });
  fs.writeFileSync(path.join(nearMeDir, 'index.html'), html, 'utf8');
  console.log('Generated Near Me index page');
}

main().catch(e => { console.error(e); process.exit(1); });
