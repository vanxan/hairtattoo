import { getHead, getNav, getFooter, esc, citySlug, listingUrl } from '../../../templates/shared.js';

const SB_URL = 'https://ingorrzmoudvoknhwjjb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc';
function mediaUrl(m) {
  const bucket = m.is_placeholder ? 'placeholders' : 'media';
  return SB_URL + '/storage/v1/object/public/' + bucket + '/' + m.storage_path;
}

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

  // Fetch media and reviews in parallel
  const [mediaRes, reviewsRes] = await Promise.all([
    fetch(
      `${SB_URL}/rest/v1/media?listing_id=eq.${l.id}&select=*&order=sort_order.asc`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    ),
    fetch(
      `${SB_URL}/rest/v1/reviews?listing_id=eq.${l.id}&status=eq.approved&select=*&order=created_at.desc&limit=5`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    )
  ]);
  const media = await mediaRes.json() || [];
  const reviews = await reviewsRes.json() || [];

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

  const html = renderDetailPage(l, media, reviews);
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600'
    }
  });
}

function starsHtml(n) {
  return '<span style="color:#F59E0B">' + '\u2605'.repeat(n) + '</span>' +
         '<span style="color:var(--bd)">' + '\u2605'.repeat(5 - n) + '</span>';
}

function renderDetailPage(l, allMedia, reviews) {
  // Separate profile photo from gallery media
  const profilePhoto = allMedia.find(m => m.is_profile);
  const galleryAll = allMedia.filter(m => !m.is_profile && m.sort_order >= 0);
  const hasReal = galleryAll.some(m => !m.is_placeholder);
  // Hide placeholders when real images exist
  const media = hasReal ? galleryAll.filter(m => !m.is_placeholder) : galleryAll;
  const ini = l.name.split(' ').map(w => w[0]).slice(0, 2).join('');
  const avatarHTML = profilePhoto
    ? `<img src="${mediaUrl(profilePhoto)}" alt="${esc(l.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : ini;

  // Badges
  let badgeHTML = '';
  if (l.claimed) {
    const hasReal = media && media.some(m => !m.is_placeholder);
    const hasPhone = !!(l.phone && l.phone.trim());
    const hasEmail = !!(l.email && l.email.trim());
    const hasServices = l.services && l.services.length >= 2;
    const hasAbout = !!(l.about && l.about.trim());
    if (hasReal && hasPhone && hasEmail && hasServices && hasAbout) {
      badgeHTML += '<span class="dp-badge dp-badge-verified">\u2713 Verified Business</span>';
    }
  }
  const isPromoted = l.promoted && l.promoted_until && new Date(l.promoted_until) > new Date();
  if (isPromoted) badgeHTML += (badgeHTML ? ' \u00b7 ' : '') + '<span class="dp-badge dp-badge-featured">\u2B50 Featured Artist</span>';

  const cs = citySlug(l.city, l.state);
  const canonical = `https://hairtattoo.com/near-me/${cs}/${l.slug}`;
  const title = `${l.name} — SMP in ${l.city}, ${l.state} | Hair Tattoo`;
  const desc = l.about ? l.about.substring(0, 160) : `${l.name} — scalp micropigmentation artist in ${l.city}, ${l.state}. View services, pricing, and contact information.`;
  const ogImage = media.length ? mediaUrl(media[0]) : null;

  // Social links
  let socHTML = '';
  if (l.instagram) socHTML += `<a href="https://instagram.com/${esc(l.instagram)}" target="_blank" rel="noopener" class="dp-social"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5"/></svg> @${esc(l.instagram)}</a>`;
  if (l.facebook) socHTML += `<a href="https://facebook.com/${esc(l.facebook)}" target="_blank" rel="noopener" class="dp-social"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg> Facebook</a>`;
  if (l.tiktok) socHTML += `<a href="https://tiktok.com/@${esc(l.tiktok)}" target="_blank" rel="noopener" class="dp-social">TikTok</a>`;
  if (l.website) socHTML += `<a href="${esc(l.website)}" target="_blank" rel="noopener" class="dp-social"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Website</a>`;

  // Star rating in header
  let ratingHTML = '';
  if (l.review_count && l.review_count > 0) {
    ratingHTML = `<div class="dp-rating">${starsHtml(Math.round(l.avg_rating || 0))} <span style="font-size:.8125rem;color:var(--t2)">${l.avg_rating || 0} (${l.review_count} review${l.review_count === 1 ? '' : 's'})</span></div>`;
  }

  // Booking button
  let bookingHTML = '';
  if (l.booking_type === 'external' && l.booking_url) {
    bookingHTML = `<a href="${esc(l.booking_url)}" target="_blank" rel="noopener" class="dp-booking" onclick="trackBooking()">Book a Consultation \u2192</a>`;
  }

  // Gallery
  let gallery = '';
  if (media.length) {
    gallery = media.map((m, i) => {
      const src = mediaUrl(m);
      const isVideo = m.type === 'video';
      if (isVideo) {
        return `<div class="gallery-item" onclick="openVideoLb('${src.replace(/'/g, "\\'")}')" style="border-radius:8px;overflow:hidden;position:relative;cursor:pointer;transition:transform .15s;aspect-ratio:1" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform=''"><video src="${src}" preload="metadata" muted style="width:100%;height:100%;object-fit:cover;display:block"></video><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:48px;height:48px;border-radius:50%;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center"><div style="width:0;height:0;border-style:solid;border-width:10px 0 10px 18px;border-color:transparent transparent transparent #fff;margin-left:3px"></div></div></div>`;
      }
      return `<div class="gallery-item" onclick="openLb(${i})" style="border-radius:8px;overflow:hidden;position:relative;cursor:pointer;transition:transform .15s;aspect-ratio:1" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform=''"><img src="${src}" loading="lazy" alt="${esc(l.name)}" style="width:100%;height:100%;object-fit:cover;display:block">${m.is_placeholder ? '<span class="c-pill">\u{1F4F7} Sample photo</span>' : ''}</div>`;
    }).join('');
  } else {
    const colors = ['#c8dbd0', '#b8d0c2', '#a8c5b4', '#d4e4d9', '#e0ebe5', '#bcd4c6'];
    const glabels = ['Before & After', 'Hairline Closeup', 'Density Session', 'Side Profile', 'Top View', 'Final Result'];
    for (let i = 0; i < 6; i++) {
      gallery += `<div style="background:${colors[i]};border-radius:8px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;flex-direction:column;color:var(--ac)"><span style="font-family:var(--se);font-size:1.5rem;opacity:.5">${ini}</span><span style="font-size:.6rem;opacity:.35;margin-top:.25rem">${glabels[i]}</span></div>`;
    }
  }

  // Reviews section
  let reviewsHTML = '';
  if (reviews.length) {
    const avgRating = l.avg_rating || (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
    const reviewCount = l.review_count || reviews.length;
    reviewsHTML = `
  <div class="dp-section">
    <h3>Reviews ${starsHtml(Math.round(parseFloat(avgRating)))} <span style="font-size:.8125rem;color:var(--t2);font-weight:400">${avgRating} (${reviewCount} review${reviewCount === 1 ? '' : 's'})</span></h3>
    <div style="display:flex;flex-direction:column;gap:.75rem;margin-top:.75rem">
      ${reviews.map(r => `<div style="background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:1rem">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem">
          <span>${starsHtml(r.rating)}</span>
          <strong style="font-size:.8125rem">${esc(r.reviewer_name)}</strong>
          <span style="font-size:.6875rem;color:var(--t3);margin-left:auto">${new Date(r.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        ${r.title ? `<div style="font-size:.875rem;font-weight:600;margin-bottom:.25rem">${esc(r.title)}</div>` : ''}
        <div style="font-size:.8125rem;color:var(--t2);line-height:1.5">${esc(r.body || '')}</div>
        ${r.artist_reply ? `<div style="margin-top:.75rem;padding:.75rem;background:var(--bg);border-radius:8px;border-left:3px solid var(--ac)">
          <div style="font-size:.6875rem;font-weight:600;color:var(--ac);text-transform:uppercase;margin-bottom:.25rem">Artist Reply</div>
          <div style="font-size:.8125rem;color:var(--t2)">${esc(r.artist_reply)}</div>
        </div>` : ''}
      </div>`).join('')}
    </div>
    ${reviewCount > 5 ? `<p style="text-align:center;margin-top:.75rem"><a href="/review.html?listing=${esc(l.slug)}" style="font-size:.8125rem">Leave a review</a></p>` : ''}
  </div>`;
  }

  // Services
  const services = (l.services || []).map(s => `<span>${esc(s)}</span>`).join('');

  // Schema.org JSON-LD
  const schemaObj = {
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
  };
  if (l.avg_rating && l.review_count) {
    schemaObj.aggregateRating = {
      '@type': 'AggregateRating',
      'ratingValue': l.avg_rating,
      'reviewCount': l.review_count
    };
  }
  const schema = JSON.stringify(schemaObj);

  // Build lightbox media data for JS
  const lbData = media.length
    ? JSON.stringify(media.filter(m => m.type !== 'video').map(m => ({ url: mediaUrl(m), isPlaceholder: m.is_placeholder })))
    : '[]';

  return `<!DOCTYPE html>
<html lang="en">
<head>
${getHead(title, desc, canonical, ogImage)}
<style>.dp-booking{display:inline-block;padding:.625rem 1.25rem;background:var(--ac);color:#fff;border-radius:var(--rs);font-size:.875rem;font-weight:500;margin-top:.75rem;transition:background .15s}.dp-booking:hover{background:var(--ac2);color:#fff}.dp-rating{margin-top:.375rem}.dp-badge{display:inline-flex;align-items:center;gap:.375rem;font-size:.8125rem;font-weight:600}.dp-badge-verified{color:var(--ac)}.dp-badge-featured{color:#D4A853}</style>
</head>
<body>
${getNav()}

<div class="detail-page">
  <a href="/near-me/${esc(cs)}/" class="dp-back"><svg class="icon" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to directory</a>

  <div class="dp-header">
    <div class="dp-av">${avatarHTML}</div>
    <div class="dp-info">
      <h1 class="dp-name">${esc(l.name)}</h1>
      <div class="dp-loc">${esc(l.address || '')}, ${esc(l.city)}, ${esc(l.state)} ${esc(l.zip || '')}</div>
      ${badgeHTML ? '<div style="margin-top:.25rem">' + badgeHTML + '</div>' : ''}
      ${ratingHTML}
      <div class="dp-socials">${socHTML}</div>
      ${bookingHTML}
    </div>
  </div>

  <div class="dp-section"><h3>About</h3><p class="dp-about">${esc(l.about || '')}</p></div>

  <div class="dp-section"><h3>Services Offered</h3><div class="dp-svcs">${services}</div></div>

  <div class="dp-section"><h3>Contact Information</h3><div class="dp-grid">
    <div class="dp-det"><label>Phone</label><span class="obf-phone" data-a="${esc((l.phone || '').slice(0, 3))}" data-b="${esc((l.phone || '').slice(3, 6))}" data-c="${esc((l.phone || '').slice(6))}">${esc(l.phone || '')}</span></div>
    <div class="dp-det"><label>Email</label><span class="obf-email" data-u="${esc((l.email || '').split('@')[0] || '')}" data-d="${esc((l.email || '').split('@')[1] || '')}">${l.email ? esc((l.email || '').split('@')[0]) + ' [at] ' + esc(((l.email || '').split('@')[1] || '').replace(/\./g, ' [dot] ')) : ''}</span></div>
    <div class="dp-det"><label>Website</label><a href="${esc(l.website || '')}" target="_blank" rel="noopener">${esc((l.website || '').replace(/https?:\/\//, ''))}</a></div>
    <div class="dp-det"><label>Location</label><span>${esc(l.city)}, ${esc(l.state)} ${esc(l.zip || '')}</span></div>
  </div></div>

  <div class="dp-section"><h3>Gallery</h3><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${gallery}</div><p style="font-size:.75rem;color:var(--t3);margin-top:.5rem;text-align:center">${l.claimed ? '' : 'Photos will appear when this business claims their page'}</p></div>

  ${reviewsHTML}

  <div class="cf" id="contactForm">
    <h3>\u{1F4E9} Send a Message to ${esc(l.name)}</h3>
    <div class="cf-row"><input type="text" placeholder="Your Name" id="cfName"><input type="tel" placeholder="Your Phone" id="cfPhone"></div>
    <div class="cf-row"><textarea placeholder="Hi, I'm interested in learning more about your SMP services..." id="cfMsg"></textarea></div>
    <button class="cf-sub" onclick="sendMessage()">Send Message \u2192</button>
  </div>

  ${!l.claimed ? `<div class="dp-claim"><span style="flex:1">Claim this page to get verified and manage your listing.</span><button onclick="location.href='/signup.html?claim=${esc(l.slug)}'">Claim Page</button></div>` : ''}
</div>

<!-- LIGHTBOX -->
<div class="lb" id="lightbox" onclick="if(event.target===this)closeLb()">
  <button class="lb-close" onclick="closeLb()">\u00d7</button>
  <button class="lb-nav lb-prev" onclick="lbNav(-1)">\u2039</button>
  <button class="lb-nav lb-next" onclick="lbNav(1)">\u203a</button>
  <div class="lb-img" id="lbImg"></div>
  <div class="lb-info" id="lbInfo"></div>
</div>

<!-- VIDEO MODAL -->
<div id="videoModalPub" style="display:none;position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.92);justify-content:center;align-items:center" onclick="if(event.target===this)closeVideoLb()">
  <button onclick="closeVideoLb()" style="position:absolute;top:1rem;right:1rem;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.1);color:#fff;font-size:1.5rem;display:flex;align-items:center;justify-content:center;cursor:pointer;border:none">\u00d7</button>
  <video id="videoPub" controls playsinline style="max-width:90vw;max-height:80vh;border-radius:8px;background:#000"></video>
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

// Track booking click
function trackBooking(){
  fetch(SB_URL+'/rest/v1/page_views',{
    method:'POST',
    headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},
    body:JSON.stringify({listing_id:LISTING_ID,path:'/booking-click'})
  }).catch(()=>{});
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
// Video modal
function openVideoLb(src){
  var v=document.getElementById('videoPub');
  v.src=src;
  var m=document.getElementById('videoModalPub');
  m.style.display='flex';
  document.body.style.overflow='hidden';
  v.play().catch(function(){});
}
function closeVideoLb(){
  var v=document.getElementById('videoPub');
  v.pause();v.src='';
  document.getElementById('videoModalPub').style.display='none';
  document.body.style.overflow='';
}

// Obfuscate contact info — assemble links from data attributes
document.querySelectorAll('.obf-email').forEach(function(el){
  var u=el.dataset.u,d=el.dataset.d;
  if(u&&d){var addr=u+'@'+d;el.innerHTML='<a href="mai'+'lto:'+addr+'">'+addr+'</a>';}
});
document.querySelectorAll('.obf-phone').forEach(function(el){
  var a=el.dataset.a,b=el.dataset.b,c=el.dataset.c;
  if(a){var num=a+b+c;var display=a.length>=3?'('+a+') '+b+'-'+c:num;el.innerHTML='<a href="t'+'el:'+num+'">'+display+'</a>';}
});

document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){closeLb();closeVideoLb();}
  if(document.getElementById('lightbox').classList.contains('open')){
    if(e.key==='ArrowLeft')lbNav(-1);
    if(e.key==='ArrowRight')lbNav(1);
  }
});
</script>
</body>
</html>`;
}
