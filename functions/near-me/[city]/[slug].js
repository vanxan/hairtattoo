import { getHead, getNav, getFooter, esc, citySlug, listingUrl } from '../../../templates/shared.js';

const SB_URL = 'https://ingorrzmoudvoknhwjjb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc';
const MEDIA_BASE = SB_URL + '/storage/v1/object/public/placeholders/';

function mediaUrl(p) { return MEDIA_BASE + encodeURIComponent(p); }

export async function onRequestGet(context) {
  const { params } = context;
  const slug = params.slug;

  // Fetch listing by slug
  const listingRes = await fetch(
    `${SB_URL}/rest/v1/listings?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
    { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
  );
  const listings = await listingRes.json();
  if (!listings || !listings.length) {
    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/html' } });
  }
  const l = listings[0];

  // Fetch media for this listing
  const mediaRes = await fetch(
    `${SB_URL}/rest/v1/media?listing_id=eq.${l.id}&select=*&order=sort_order.asc`,
    { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
  );
  const media = await mediaRes.json() || [];

  // Track page view (non-blocking)
  context.waitUntil(
    fetch(`${SB_URL}/rest/v1/page_views`, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ listing_id: l.id, path: `/near-me/${params.city}/${slug}` })
    })
  );

  const html = renderDetailPage(l, media);
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600'
    }
  });
}

function renderDetailPage(l, media) {
  const ini = l.name.split(' ').map(w => w[0]).slice(0, 2).join('');
  const pr = l.price_range || '$$';
  const cs = citySlug(l.city, l.state);
  const canonical = `https://hairtattoo.com/near-me/${cs}/${l.slug}`;
  const title = `${l.name} — Hair Tattoo & SMP | HairTattoo.com`;
  const desc = l.about ? l.about.substring(0, 160) : `${l.name} — scalp micropigmentation artist in ${l.city}, ${l.state}. View services, pricing, and contact information.`;
  const ogImage = media.length ? mediaUrl(media[0].storage_path) : null;

  // Social links
  let socHTML = '';
  if (l.instagram) socHTML += `<a href="https://instagram.com/${esc(l.instagram)}" target="_blank" rel="noopener" class="dp-social"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5"/></svg> @${esc(l.instagram)}</a>`;
  if (l.facebook) socHTML += `<a href="https://facebook.com/${esc(l.facebook)}" target="_blank" rel="noopener" class="dp-social"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg> Facebook</a>`;
  if (l.tiktok) socHTML += `<a href="https://tiktok.com/@${esc(l.tiktok)}" target="_blank" rel="noopener" class="dp-social">TikTok</a>`;
  if (l.website) socHTML += `<a href="${esc(l.website)}" target="_blank" rel="noopener" class="dp-social"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Website</a>`;

  // Gallery
  let gallery = '';
  if (media.length) {
    gallery = media.map((m, i) => `<div class="gallery-item" onclick="openLb(${i})" style="border-radius:8px;overflow:hidden;position:relative;cursor:pointer;transition:transform .15s" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform=''"><img src="${mediaUrl(m.storage_path)}" loading="lazy" width="240" height="200" alt="${esc(l.name)}" style="width:100%;height:200px;object-fit:cover;display:block">${m.is_placeholder ? '<span class="c-pill">\u{1F4F7} Sample photo</span>' : ''}</div>`).join('');
  } else {
    const colors = ['#c8dbd0', '#b8d0c2', '#a8c5b4', '#d4e4d9', '#e0ebe5', '#bcd4c6'];
    const glabels = ['Before & After', 'Hairline Closeup', 'Density Session', 'Side Profile', 'Top View', 'Final Result'];
    for (let i = 0; i < 6; i++) {
      gallery += `<div style="background:${colors[i]};border-radius:8px;height:200px;display:flex;align-items:center;justify-content:center;flex-direction:column;color:var(--ac)"><span style="font-family:var(--se);font-size:1.5rem;opacity:.5">${ini}</span><span style="font-size:.6rem;opacity:.35;margin-top:.25rem">${glabels[i]}</span></div>`;
    }
  }

  // Services
  const services = (l.services || []).map(s => `<span>${esc(s)}</span>`).join('');

  // Schema.org JSON-LD
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    'name': l.name,
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': l.address,
      'addressLocality': l.city,
      'addressRegion': l.state,
      'postalCode': l.zip,
      'addressCountry': 'US'
    },
    'telephone': l.phone,
    'email': l.email,
    'url': l.website,
    'description': l.about,
    'geo': {
      '@type': 'GeoCoordinates',
      'latitude': l.lat,
      'longitude': l.lng
    },
    'makesOffer': (l.services || []).map(s => ({
      '@type': 'Offer',
      'itemOffered': { '@type': 'Service', 'name': s }
    }))
  });

  // Build lightbox media data for JS
  const lbData = media.length
    ? JSON.stringify(media.map(m => ({ url: mediaUrl(m.storage_path), isPlaceholder: m.is_placeholder })))
    : '[]';

  return `<!DOCTYPE html>
<html lang="en">
<head>
${getHead(title, desc, canonical, ogImage)}
</head>
<body>
${getNav()}

<div class="detail-page">
  <a href="/near-me/${esc(cs)}/" class="dp-back"><svg class="icon" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to directory</a>

  <div class="dp-header">
    <div class="dp-av">${ini}</div>
    <div class="dp-info">
      <h1 class="dp-name">${esc(l.name)}</h1>
      <div class="dp-loc">${esc(l.address || '')}, ${esc(l.city)}, ${esc(l.state)} ${esc(l.zip || '')}</div>
      <div class="dp-price">${esc(pr)} \u00b7 Scalp Micropigmentation</div>
      <div class="dp-socials">${socHTML}</div>
    </div>
  </div>

  <div class="dp-section"><h3>About</h3><p class="dp-about">${esc(l.about || '')}</p></div>

  <div class="dp-section"><h3>Services Offered</h3><div class="dp-svcs">${services}</div></div>

  <div class="dp-section"><h3>Contact Information</h3><div class="dp-grid">
    <div class="dp-det"><label>Phone</label><a href="tel:${esc(l.phone || '')}">${esc(l.phone || '')}</a></div>
    <div class="dp-det"><label>Email</label><a href="mailto:${esc(l.email || '')}">${esc(l.email || '')}</a></div>
    <div class="dp-det"><label>Website</label><a href="${esc(l.website || '')}" target="_blank" rel="noopener">${esc((l.website || '').replace(/https?:\/\//, ''))}</a></div>
    <div class="dp-det"><label>Location</label><span>${esc(l.city)}, ${esc(l.state)} ${esc(l.zip || '')}</span></div>
  </div></div>

  <div class="dp-section"><h3>Gallery</h3><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${gallery}</div><p style="font-size:.75rem;color:var(--t3);margin-top:.5rem;text-align:center">${l.claimed ? '' : 'Photos will appear when this business claims their page'}</p></div>

  <div class="cf" id="contactForm">
    <h3>\u{1F4E9} Send a Message to ${esc(l.name)}</h3>
    <div class="cf-row"><input type="text" placeholder="Your Name" id="cfName"><input type="tel" placeholder="Your Phone" id="cfPhone"></div>
    <div class="cf-row"><textarea placeholder="Hi, I'm interested in learning more about your SMP services..." id="cfMsg"></textarea></div>
    <button class="cf-sub" onclick="sendMessage()">Send Message \u2192</button>
  </div>

  ${!l.claimed ? `<div class="dp-claim"><span style="flex:1">Is this your business? Claim it to manage your listing.</span><button onclick="location.href='/signup.html?claim=${esc(l.slug)}'">Claim Page</button></div>` : ''}
</div>

<!-- LIGHTBOX -->
<div class="lb" id="lightbox" onclick="if(event.target===this)closeLb()">
  <button class="lb-close" onclick="closeLb()">\u00d7</button>
  <button class="lb-nav lb-prev" onclick="lbNav(-1)">\u2039</button>
  <button class="lb-nav lb-next" onclick="lbNav(1)">\u203a</button>
  <div class="lb-img" id="lbImg"></div>
  <div class="lb-info" id="lbInfo"></div>
</div>

${getFooter()}

<script type="application/ld+json">${schema}</script>

<script>
// Contact form
const SB_URL='${SB_URL}';
const SB_KEY='${SB_KEY}';
const LISTING_ID=${l.id};

async function sendMessage(){
  const n=document.getElementById('cfName').value.trim();
  const p=document.getElementById('cfPhone').value.trim();
  const m=document.getElementById('cfMsg').value.trim();
  if(!n||!p){alert('Please enter your name and phone number.');return;}
  try{
    const res=await fetch(SB_URL+'/rest/v1/leads',{
      method:'POST',
      headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},
      body:JSON.stringify({listing_id:LISTING_ID,sender_name:n,sender_phone:p,sender_message:m||null})
    });
    if(!res.ok)throw new Error('Failed');
    document.getElementById('contactForm').innerHTML='<div class="cf-ok">\u2713 Message sent! The artist will reach out to you shortly.</div>';
  }catch(e){console.error(e);alert('Something went wrong. Please try again.');}
}

// Lightbox
const lbMedia=${lbData};
let lbIdx=0;
function openLb(idx){
  if(!lbMedia.length)return;
  lbIdx=idx||0;
  renderLb();
  document.getElementById('lightbox').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeLb(){
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow='';
}
function lbNav(dir){
  lbIdx=(lbIdx+dir+lbMedia.length)%lbMedia.length;
  renderLb();
}
function renderLb(){
  const item=lbMedia[lbIdx];if(!item)return;
  const imgEl=document.getElementById('lbImg');
  imgEl.style.background='#111';
  imgEl.innerHTML='<img src="'+item.url+'" alt="${esc(l.name).replace(/'/g, "\\'")}" style="max-width:90vw;max-height:70vh;object-fit:contain;border-radius:8px">'+(item.isPlaceholder?'<span class="c-pill" style="bottom:1rem;left:1rem">\u{1F4F7} Sample photo</span>':'');
  const dots=lbMedia.length>1?'<div style="display:flex;gap:4px;justify-content:center;margin-top:.5rem">'+lbMedia.map(function(_,i){return '<span style="width:6px;height:6px;border-radius:50%;background:'+(i===lbIdx?'#fff':'rgba(255,255,255,.4)')+'"></span>';}).join('')+'</div>':'';
  document.getElementById('lbInfo').innerHTML='<h4>${esc(l.name).replace(/'/g, "\\'")}</h4><p>${esc(l.city)}, ${esc(l.state)}</p>'+dots;
}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape')closeLb();
  if(document.getElementById('lightbox').classList.contains('open')){
    if(e.key==='ArrowLeft')lbNav(-1);
    if(e.key==='ArrowRight')lbNav(1);
  }
});
</script>
</body>
</html>`;
}
