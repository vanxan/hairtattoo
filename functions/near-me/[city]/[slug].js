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
  const isPromoted = l.promoted && l.promoted_until && new Date(l.promoted_until) > new Date();

  // Fetch media and reviews in parallel (more reviews for premium pages)
  const [mediaRes, reviewsRes] = await Promise.all([
    fetch(
      `${SB_URL}/rest/v1/media?listing_id=eq.${l.id}&select=*&order=sort_order.asc`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    ),
    fetch(
      `${SB_URL}/rest/v1/reviews?listing_id=eq.${l.id}&status=eq.approved&select=*&order=created_at.desc${isPromoted ? '&limit=50' : '&limit=5'}`,
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

  const html = isPromoted ? renderPremiumPage(l, media, reviews) : renderDetailPage(l, media, reviews);
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
  const galleryAll = allMedia.filter(m => !m.is_profile && !m.is_cover && m.sort_order >= 0);
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

function renderPremiumPage(l, allMedia, reviews) {
  const profilePhoto = allMedia.find(m => m.is_profile);
  const coverPhoto = allMedia.find(m => m.is_cover) || allMedia.find(m => !m.is_profile && !m.is_placeholder) || allMedia.find(m => !m.is_profile);
  const galleryAll = allMedia.filter(m => !m.is_profile && !m.is_cover && m.sort_order >= 0);
  const hasReal = galleryAll.some(m => !m.is_placeholder);
  const media = hasReal ? galleryAll.filter(m => !m.is_placeholder) : galleryAll;
  const ini = l.name.split(' ').map(w => w[0]).slice(0, 2).join('');

  // Cover image
  const coverUrl = coverPhoto ? mediaUrl(coverPhoto) : '';
  const coverHTML = coverUrl
    ? `<img class="hero-img" src="${coverUrl}" alt="${esc(l.name)} SMP Studio">`
    : '<div class="hero-img" style="background:linear-gradient(135deg,#2D5A3D,#3A7350)"></div>';

  // Avatar (square for premium)
  const avatarHTML = profilePhoto
    ? `<img src="${mediaUrl(profilePhoto)}" alt="${esc(l.name)}">`
    : `<span class="initials">${ini}</span>`;

  // Badges
  let isVerified = false;
  if (l.claimed) {
    const hasRealPhotos = allMedia.some(m => !m.is_placeholder && !m.is_profile);
    const hasPhone = !!(l.phone && l.phone.trim());
    const hasEmail = !!(l.email && l.email.trim());
    const hasServices = l.services && l.services.length >= 2;
    const hasAbout = !!(l.about && l.about.trim());
    isVerified = hasRealPhotos && hasPhone && hasEmail && hasServices && hasAbout;
  }
  let badgesHTML = '';
  if (isVerified) badgesHTML += '<span class="badge-verified">\u2713 Verified</span>';
  badgesHTML += '<span class="badge-featured">\u2B50 Featured</span>';

  // SEO
  const cs = citySlug(l.city, l.state);
  const canonical = `https://hairtattoo.com/near-me/${cs}/${l.slug}`;
  const title = `${l.name} \u2014 SMP in ${l.city}, ${l.state} | Hair Tattoo`;
  const desc = l.about ? l.about.substring(0, 160) : `${l.name} \u2014 scalp micropigmentation artist in ${l.city}, ${l.state}. View services, pricing, and contact information.`;
  const ogImage = coverUrl || (media.length ? mediaUrl(media[0]) : null);

  // Social pills
  let socialsHTML = '';
  if (l.instagram) socialsHTML += `<a href="https://instagram.com/${esc(l.instagram)}" target="_blank" rel="noopener" class="social-pill">\u25C9 @${esc(l.instagram)}</a>`;
  if (l.website) socialsHTML += `<a href="${esc(l.website)}" target="_blank" rel="noopener" class="social-pill">\uD83C\uDF10 ${esc((l.website || '').replace(/https?:\/\//, '').replace(/\/$/, ''))}</a>`;
  if (l.tiktok) socialsHTML += `<a href="https://tiktok.com/@${esc(l.tiktok)}" target="_blank" rel="noopener" class="social-pill">\u266A @${esc(l.tiktok)}</a>`;
  if (l.facebook) socialsHTML += `<a href="https://facebook.com/${esc(l.facebook)}" target="_blank" rel="noopener" class="social-pill"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg> Facebook</a>`;

  // Rating
  const avgRating = l.avg_rating || 0;
  const reviewCount = l.review_count || reviews.length || 0;
  let ratingHTML = '';
  if (reviewCount > 0) {
    const fullStars = Math.round(avgRating);
    ratingHTML = `<div class="profile-rating"><span class="stars">${'\u2605'.repeat(fullStars)}${'\u2606'.repeat(5 - fullStars)}</span><span class="rating-text">${avgRating} (${reviewCount} review${reviewCount === 1 ? '' : 's'})</span></div>`;
  }

  // CTA buttons
  let ctaHTML = '<a href="#prem-contact" class="cta-btn cta-secondary">\uD83D\uDCAC Message</a>';
  if (l.booking_type === 'external' && l.booking_url) {
    ctaHTML += `<a href="${esc(l.booking_url)}" target="_blank" rel="noopener" class="cta-btn cta-primary" onclick="trackBooking()">\uD83D\uDCC5 Book</a>`;
  }
  if (l.phone) {
    ctaHTML += `<a class="cta-btn cta-primary obf-call" data-a="${esc((l.phone || '').slice(0, 3))}" data-b="${esc((l.phone || '').slice(3, 6))}" data-c="${esc((l.phone || '').slice(6))}">\uD83D\uDCDE Call</a>`;
  }

  // Sticky bar
  let stickyHTML = '<a href="#prem-contact" class="cta-btn cta-secondary">\uD83D\uDCAC Message</a>';
  if (l.phone) {
    stickyHTML += `<a class="cta-btn cta-primary obf-call" data-a="${esc((l.phone || '').slice(0, 3))}" data-b="${esc((l.phone || '').slice(3, 6))}" data-c="${esc((l.phone || '').slice(6))}">\uD83D\uDCDE Call</a>`;
  }

  // Gallery
  const photos = media.filter(m => m.type !== 'video');
  const videos = media.filter(m => m.type === 'video');
  const galleryCountText = `\uD83D\uDCF7 ${photos.length} photo${photos.length !== 1 ? 's' : ''}` + (videos.length ? ` \u00b7 ${videos.length} video${videos.length !== 1 ? 's' : ''}` : '');

  let galleryHTML = '';
  if (media.length) {
    galleryHTML = media.map((m, i) => {
      const src = mediaUrl(m);
      if (m.type === 'video') {
        return `<div class="gallery-item" onclick="openVideoLb('${src.replace(/'/g, "\\'")}')" ><video src="${src}" preload="metadata" muted style="width:100%;height:100%;object-fit:cover"></video><div class="play-overlay"><div class="play-btn">\u25B6</div></div></div>`;
      }
      return `<div class="gallery-item" onclick="openLb(${i})"><img src="${src}" loading="lazy" alt="${esc(l.name)} SMP">${m.is_placeholder ? '<span style="position:absolute;bottom:8px;left:8px;background:rgba(255,255,255,.85);padding:2px 8px;border-radius:12px;font-size:.625rem;color:#555">\uD83D\uDCF7 Sample photo</span>' : ''}</div>`;
    }).join('');
  } else {
    const colors = ['#c8dbd0', '#b8d0c2', '#a8c5b4', '#d4e4d9', '#e0ebe5', '#bcd4c6'];
    const labels = ['Before & After', 'Hairline Closeup', 'Density Session', 'Side Profile', 'Top View', 'Final Result'];
    for (let i = 0; i < 6; i++) {
      galleryHTML += `<div class="gallery-item" style="background:${colors[i]};display:flex;align-items:center;justify-content:center;flex-direction:column;cursor:default"><span style="font-family:var(--se);font-size:1.5rem;color:var(--ac);opacity:.5">${ini}</span><span style="font-size:.6rem;opacity:.35;margin-top:.25rem">${labels[i]}</span></div>`;
    }
  }

  // Services
  const servicesHTML = (l.services || []).map(s => `<span class="service-tag">${esc(s)}</span>`).join('');

  // Reviews tab
  let reviewsTabHTML = '';
  if (reviews.length) {
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
    const displayRating = avgRating || (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
    const fullStars = Math.round(parseFloat(displayRating));
    const breakdownHTML = [5, 4, 3, 2, 1].map(star => {
      const count = dist[star - 1];
      const pct = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
      return `<div class="breakdown-row"><span class="num">${star}</span><div class="breakdown-bar"><div class="breakdown-fill" style="width:${pct}%"></div></div><span class="breakdown-count">${count}</span></div>`;
    }).join('');
    const reviewCardsHTML = reviews.map(r => {
      const rStars = '\u2605'.repeat(r.rating) + '\u2606'.repeat(5 - r.rating);
      const date = new Date(r.created_at).toLocaleDateString('en', { month: 'long', year: 'numeric' });
      return `<div class="review-card"><div class="review-header"><div><div class="reviewer-name">${esc(r.reviewer_name)}</div><div class="review-stars">${rStars}</div></div><span class="review-date">${date}</span></div>${r.title ? `<div style="font-weight:600;margin-bottom:.5rem">${esc(r.title)}</div>` : ''}<p class="review-body">${esc(r.body || '')}</p>${r.artist_reply ? `<div class="review-reply"><div class="review-reply-label">${esc(l.name)} replied</div>${esc(r.artist_reply)}</div>` : ''}</div>`;
    }).join('');
    reviewsTabHTML = `<div class="reviews-summary"><div><div class="reviews-big-num">${displayRating}</div><div class="stars" style="margin-top:4px">${'\u2605'.repeat(fullStars)}${'\u2606'.repeat(5 - fullStars)}</div><div style="color:#888;font-size:.8125rem;margin-top:2px">${reviewCount} review${reviewCount === 1 ? '' : 's'}</div></div><div class="reviews-breakdown">${breakdownHTML}</div></div>${reviewCardsHTML}`;
  } else {
    reviewsTabHTML = '<p style="color:#888;text-align:center;padding:2rem 0">No reviews yet</p>';
  }

  // Schema
  const schemaObj = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', 'name': l.name,
    'address': { '@type': 'PostalAddress', 'streetAddress': l.address, 'addressLocality': l.city, 'addressRegion': l.state, 'postalCode': l.zip, 'addressCountry': 'US' },
    'telephone': l.phone, 'url': l.website, 'description': l.about,
    'geo': { '@type': 'GeoCoordinates', 'latitude': l.lat, 'longitude': l.lng },
    'makesOffer': (l.services || []).map(s => ({ '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': s } }))
  };
  if (l.avg_rating && l.review_count) {
    schemaObj.aggregateRating = { '@type': 'AggregateRating', 'ratingValue': l.avg_rating, 'reviewCount': l.review_count };
  }
  const schema = JSON.stringify(schemaObj);

  // Lightbox data
  const lbData = media.length
    ? JSON.stringify(media.filter(m => m.type !== 'video').map(m => ({ url: mediaUrl(m), isPlaceholder: m.is_placeholder })))
    : '[]';

  const premiumCSS = `.hero{position:relative;width:100%;max-width:none;height:420px;overflow:hidden;margin:0;padding:0;text-align:left}.hero-img{width:100%;height:100%;object-fit:cover;display:block}.hero-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.3) 0%,transparent 40%,transparent 50%,rgba(0,0,0,.45) 100%)}.hero-nav{position:absolute;top:0;left:0;right:0;z-index:10}.hero-nav-inner{max-width:1200px;margin:0 auto;padding:1.25rem 2rem;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,.5)}.hero-nav .logo{font-family:var(--se);font-size:1.4rem;color:#fff;text-decoration:none;text-shadow:0 1px 4px rgba(0,0,0,.3)}.hero-nav .logo span{color:#a8d4b8}.hero-nav .nav-r{display:flex;gap:1.25rem;align-items:center}.hero-nav .nav-r a{color:rgba(255,255,255,.9);font-size:.875rem;text-decoration:none;text-shadow:0 1px 4px rgba(0,0,0,.3)}.profile-header{width:100%;max-width:1200px;margin:0 auto;padding:0 2rem;position:relative}.profile-avatar{width:120px;height:120px;border-radius:16px;border:4px solid #FAFAF8;overflow:hidden;margin-top:-60px;position:relative;z-index:20;background:#2D5A3D;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.12)}.profile-avatar img{width:100%;height:100%;object-fit:cover}.profile-avatar .initials{color:#fff;font-family:var(--se);font-size:2rem;font-weight:700}.profile-meta{display:flex;align-items:flex-start;justify-content:space-between;margin-top:1rem;gap:1.5rem;flex-wrap:wrap}.profile-left{flex:1;min-width:280px}.profile-right{display:flex;gap:.75rem;flex-shrink:0;align-items:flex-start;padding-top:.25rem}.profile-name{font-family:var(--se);font-size:2.25rem;line-height:1.15;display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}.badge-verified{display:inline-flex;align-items:center;gap:4px;background:#F0F5F0;color:#2D5A3D;padding:4px 12px;border-radius:20px;font-size:.75rem;font-weight:600;font-family:var(--f)}.badge-featured{display:inline-flex;align-items:center;gap:4px;background:#FFF8E7;color:#B8860B;padding:4px 12px;border-radius:20px;font-size:.75rem;font-weight:600;font-family:var(--f);border:1px solid #E8D5A3}.profile-location{color:#666;font-size:.9375rem;margin-top:6px;display:flex;align-items:center;gap:6px}.profile-tagline{color:#444;font-size:1rem;margin-top:.5rem;line-height:1.5;max-width:600px}.profile-rating{display:flex;align-items:center;gap:8px;margin-top:.75rem}.stars{color:#D4A853;font-size:1.1rem;letter-spacing:1px}.rating-text{color:#666;font-size:.875rem}.profile-socials{display:flex;gap:.625rem;margin-top:.875rem;flex-wrap:wrap}.social-pill{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--bd);padding:5px 14px;border-radius:20px;font-size:.8125rem;color:#555;text-decoration:none;background:#fff;transition:all .2s}.social-pill:hover{border-color:var(--ac);color:var(--ac);background:#F0F5F0}.cta-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 28px;border-radius:12px;font-size:.9375rem;font-weight:600;text-decoration:none;cursor:pointer;transition:all .2s;font-family:var(--f);border:none}.cta-primary{background:var(--ac);color:#fff}.cta-primary:hover{background:var(--ac2)}.cta-secondary{background:#fff;color:var(--ac);border:2px solid var(--ac)}.cta-secondary:hover{background:#F0F5F0}.content-area{width:100%;max-width:1200px;margin:0 auto;padding:0 2rem}.tabs{display:flex;gap:0;border-bottom:2px solid var(--bd);margin-top:2rem}.tab{padding:.875rem 1.5rem;font-size:.9375rem;font-weight:500;color:#888;cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all .2s;background:none;border-top:none;border-left:none;border-right:none;font-family:var(--f)}.tab.active{color:var(--ac);border-bottom-color:var(--ac);font-weight:600}.tab:hover{color:var(--ac)}.tab-content{display:none;padding:2rem 0 3rem}.tab-content.active{display:block}.section-label{font-size:.6875rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#888;margin-bottom:.75rem}.gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.gallery-item{aspect-ratio:1;border-radius:12px;overflow:hidden;cursor:pointer;position:relative}.gallery-item img{width:100%;height:100%;object-fit:cover;transition:transform .3s}.gallery-item:hover img{transform:scale(1.05)}.gallery-item .play-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.2)}.gallery-item .play-btn{width:48px;height:48px;background:rgba(255,255,255,.9);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.25rem}.gallery-count{display:flex;align-items:center;gap:6px;color:#888;font-size:.8125rem;margin-bottom:1rem}.about-section{margin-bottom:2.5rem}.about-text{font-size:1rem;line-height:1.75;color:#444;max-width:800px}.services-grid{display:flex;flex-wrap:wrap;gap:10px;margin-top:.5rem}.service-tag{background:#F0F5F0;color:var(--ac);padding:8px 18px;border-radius:24px;font-size:.875rem;font-weight:500}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-top:.5rem}.info-item .info-label{font-size:.6875rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#888;margin-bottom:4px}.info-item .info-val{font-size:.9375rem;color:var(--text)}.info-item .info-val a{color:var(--ac);text-decoration:none}.info-item .info-val a:hover{text-decoration:underline}.reviews-summary{display:flex;align-items:center;gap:2rem;margin-bottom:2rem;padding:1.5rem;background:#fff;border:1px solid var(--bd);border-radius:16px}.reviews-big-num{font-family:var(--se);font-size:3.5rem;line-height:1}.reviews-breakdown{flex:1}.breakdown-row{display:flex;align-items:center;gap:8px;margin-bottom:4px}.breakdown-row .num{font-size:.75rem;color:#888;width:12px;text-align:right}.breakdown-bar{flex:1;height:6px;background:var(--bd);border-radius:3px;overflow:hidden}.breakdown-fill{height:100%;background:#D4A853;border-radius:3px}.breakdown-count{font-size:.75rem;color:#888;width:20px}.review-card{background:#fff;border:1px solid var(--bd);border-radius:16px;padding:1.5rem;margin-bottom:1rem}.review-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.75rem}.reviewer-name{font-weight:600;font-size:.9375rem}.review-date{color:#888;font-size:.8125rem}.review-stars{color:#D4A853;margin-bottom:.5rem;font-size:.875rem}.review-body{color:#444;font-size:.9375rem;line-height:1.6}.review-reply{margin-top:1rem;padding:1rem;background:#F5F4F0;border-radius:12px;font-size:.875rem}.review-reply-label{font-weight:600;font-size:.8125rem;color:var(--ac);margin-bottom:4px}.location-card{background:#fff;border:1px solid var(--bd);border-radius:16px;padding:1.5rem}.location-address{font-size:1.0625rem;line-height:1.6;margin-bottom:1rem}.map-placeholder{width:100%;height:300px;background:var(--bd);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#888;font-size:.875rem}.contact-section{width:100%;max-width:1200px;margin:0 auto;padding:0 2rem 3rem}.contact-card{background:#fff;border:1px solid var(--bd);border-radius:16px;padding:2rem;max-width:600px}.contact-card h3{font-family:var(--se);font-size:1.5rem;margin-bottom:1rem}.form-row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.75rem}.form-input{width:100%;padding:12px 14px;border:1px solid var(--bd);border-radius:10px;font-size:.9375rem;font-family:var(--f);background:#fff}.form-input:focus{outline:none;border-color:var(--ac)}.form-ta{width:100%;padding:12px 14px;border:1px solid var(--bd);border-radius:10px;font-size:.9375rem;font-family:var(--f);resize:vertical;min-height:100px}.form-ta:focus{outline:none;border-color:var(--ac)}.form-submit{width:100%;padding:14px;background:var(--ac);color:#fff;border:none;border-radius:12px;font-size:1rem;font-weight:600;cursor:pointer;font-family:var(--f);margin-top:.5rem}.form-submit:hover{background:var(--ac2)}.sticky-bar{display:none;position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid var(--bd);padding:.75rem 1rem;z-index:100;gap:.75rem}.sticky-bar .cta-btn{flex:1;text-align:center;padding:14px;font-size:.9375rem}.p-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:300;display:none;align-items:center;justify-content:center;flex-direction:column}.p-lightbox.open{display:flex}.p-lightbox img{max-width:90vw;max-height:80vh;object-fit:contain;border-radius:8px}.p-lb-close{position:absolute;top:1rem;right:1.5rem;color:#fff;font-size:2rem;cursor:pointer;background:none;border:none;z-index:301}.p-lb-nav{position:absolute;top:50%;color:#fff;font-size:2rem;cursor:pointer;background:rgba(255,255,255,.15);border:none;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;transform:translateY(-50%)}.p-lb-prev{left:1rem}.p-lb-next{right:1rem}.p-lb-counter{color:rgba(255,255,255,.6);font-size:.8125rem;margin-top:1rem}@media(max-width:768px){.hero{height:280px}.profile-avatar{width:96px;height:96px;border-radius:14px;margin-top:-48px}.profile-name{font-size:1.625rem}.profile-meta{flex-direction:column}.profile-right{width:100%}.profile-right .cta-btn{flex:1}.tabs{overflow-x:auto;-webkit-overflow-scrolling:touch}.tab{white-space:nowrap;padding:.75rem 1rem;font-size:.875rem}.info-grid{grid-template-columns:1fr}.gallery-grid{grid-template-columns:repeat(2,1fr)}.form-row{grid-template-columns:1fr}.reviews-summary{flex-direction:column;text-align:center}.sticky-bar{display:flex}.contact-section{padding-bottom:6rem}.hero-nav-inner{padding:1rem 1rem}}@media(max-width:480px){.hero{height:220px}.profile-avatar{width:80px;height:80px;border-radius:12px;margin-top:-40px}.profile-name{font-size:1.375rem}.gallery-grid{grid-template-columns:repeat(2,1fr);gap:8px}}.hero-nav-gradient{position:absolute;top:0;left:0;right:0;height:80px;background:linear-gradient(to bottom,rgba(0,0,0,.6) 0%,rgba(0,0,0,.3) 50%,transparent 100%);z-index:5;pointer-events:none}.hero-nav .nav-dd{position:relative}.hero-nav .nav-dd-btn{background:#fff;color:#2D5A3D;padding:7px 14px;border-radius:8px;font-weight:600;font-size:.8125rem;display:inline-flex;align-items:center;gap:.375rem;cursor:pointer;border:none;font-family:var(--f);transition:background .15s;text-shadow:none}.hero-nav .nav-dd-btn:hover{background:rgba(255,255,255,.9)}.hero-nav .nav-dd-btn svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2.5;transition:transform .2s}.hero-nav .nav-dd.open .nav-dd-btn svg{transform:rotate(180deg)}.hero-nav .nav-menu{display:none;position:absolute;right:0;top:calc(100% + 6px);background:#fff;border:1px solid var(--bd);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.15);min-width:200px;padding:.375rem;z-index:110}.hero-nav .nav-dd.open .nav-menu{display:block}.hero-nav .nav-menu a{display:block;padding:.5rem .75rem;border-radius:6px;font-size:.875rem;color:#1A1A1A;font-weight:400;text-decoration:none;text-shadow:none;transition:background .1s}.hero-nav .nav-menu a:hover{background:#F0F5F0}.hero-nav .nm-sep{height:1px;background:var(--bd);margin:.25rem .75rem}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
${getHead(title, desc, canonical, ogImage)}
<style>${premiumCSS}</style>
</head>
<body>
<div class="hero">
  ${coverHTML}
  <div class="hero-overlay"></div>
  <div class="hero-nav-gradient"></div>
  <nav class="hero-nav">
    <div class="hero-nav-inner">
      <a href="/" class="logo">Hair<span>Tattoo</span></a>
      <div class="nav-r">
        <a href="/near-me/">Near Me</a>
        <div class="nav-dd" id="navDD">
          <button class="nav-dd-btn" onclick="document.getElementById('navDD').classList.toggle('open')">For Pros <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></button>
          <div class="nav-menu">
            <a href="/for-professionals">Why Hair Tattoo?</a>
            <a href="/signup.html">Create Your Page</a>
            <div class="nm-sep"></div>
            <a href="/signup.html?mode=signin">Sign In</a>
          </div>
        </div>
      </div>
    </div>
  </nav>
</div>
<div class="profile-header">
  <div class="profile-avatar">${avatarHTML}</div>
  <div class="profile-meta">
    <div class="profile-left">
      <h1 class="profile-name">${esc(l.name)} ${badgesHTML}</h1>
      <p class="profile-location">\uD83D\uDCCD ${esc(l.city)}, ${esc(l.state)} \u00b7 Scalp Micropigmentation</p>
      ${l.about ? `<p class="profile-tagline">${esc(l.about.length > 200 ? l.about.substring(0, 200) + '...' : l.about)}</p>` : ''}
      ${ratingHTML}
      ${socialsHTML ? `<div class="profile-socials">${socialsHTML}</div>` : ''}
    </div>
    <div class="profile-right">${ctaHTML}</div>
  </div>
</div>
<div class="content-area">
  <div class="tabs">
    <button class="tab active" data-tab="portfolio">Portfolio</button>
    <button class="tab" data-tab="about">About</button>
    <button class="tab" data-tab="reviews">Reviews</button>
    <button class="tab" data-tab="location">Location</button>
  </div>
  <div class="tab-content active" id="tab-portfolio">
    <div class="gallery-count">${galleryCountText}</div>
    <div class="gallery-grid">${galleryHTML}</div>
  </div>
  <div class="tab-content" id="tab-about">
    ${servicesHTML ? `<div class="about-section"><div class="section-label">SERVICES OFFERED</div><div class="services-grid">${servicesHTML}</div></div>` : ''}
    ${l.about ? `<div class="about-section"><div class="section-label">ABOUT</div><p class="about-text">${esc(l.about).replace(/\n/g, '<br>')}</p></div>` : ''}
    <div class="about-section">
      <div class="section-label">CONTACT INFORMATION</div>
      <div class="info-grid">
        <div class="info-item"><div class="info-label">PHONE</div><div class="info-val"><span class="obf-phone" data-a="${esc((l.phone || '').slice(0, 3))}" data-b="${esc((l.phone || '').slice(3, 6))}" data-c="${esc((l.phone || '').slice(6))}">${esc(l.phone || '')}</span></div></div>
        <div class="info-item"><div class="info-label">EMAIL</div><div class="info-val"><span class="obf-email" data-u="${esc((l.email || '').split('@')[0] || '')}" data-d="${esc((l.email || '').split('@')[1] || '')}">${l.email ? esc((l.email || '').split('@')[0]) + ' [at] ' + esc(((l.email || '').split('@')[1] || '').replace(/\./g, ' [dot] ')) : ''}</span></div></div>
        <div class="info-item"><div class="info-label">WEBSITE</div><div class="info-val">${l.website ? `<a href="${esc(l.website)}" target="_blank" rel="noopener">${esc((l.website || '').replace(/https?:\/\//, ''))}</a>` : ''}</div></div>
        <div class="info-item"><div class="info-label">LOCATION</div><div class="info-val">${esc(l.address || '')}<br>${esc(l.city)}, ${esc(l.state)} ${esc(l.zip || '')}</div></div>
      </div>
    </div>
  </div>
  <div class="tab-content" id="tab-reviews">${reviewsTabHTML}</div>
  <div class="tab-content" id="tab-location">
    <div class="location-card">
      <div class="section-label">ADDRESS</div>
      <p class="location-address">${esc(l.address || '')}<br>${esc(l.city)}, ${esc(l.state)} ${esc(l.zip || '')}</p>
      <div class="map-placeholder">\uD83D\uDCCD Map integration coming soon</div>
    </div>
  </div>
</div>
<div class="contact-section" id="prem-contact">
  <div class="contact-card">
    <h3>Send a Message to ${esc(l.name)}</h3>
    <div class="form-row">
      <input class="form-input" placeholder="Your Name" id="cfName">
      <input class="form-input" placeholder="Your Phone" id="cfPhone">
    </div>
    <textarea class="form-ta" placeholder="Hi, I'm interested in learning more about your SMP services..." id="cfMsg"></textarea>
    <button class="form-submit" onclick="sendMessage()">Send Message \u2192</button>
  </div>
</div>
<div class="sticky-bar">${stickyHTML}</div>
<div class="p-lightbox" id="lightbox" onclick="if(event.target===this)closeLb()">
  <button class="p-lb-close" onclick="closeLb()">\u00d7</button>
  <button class="p-lb-nav p-lb-prev" onclick="lbNav(-1)">\u2039</button>
  <img id="lbImg" src="" alt="">
  <button class="p-lb-nav p-lb-next" onclick="lbNav(1)">\u203a</button>
  <div class="p-lb-counter" id="lbCounter"></div>
</div>
<div id="videoModal" style="display:none;position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.92);justify-content:center;align-items:center" onclick="if(event.target===this)closeVideoLb()">
  <button onclick="closeVideoLb()" style="position:absolute;top:1rem;right:1rem;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.1);color:#fff;font-size:1.5rem;display:flex;align-items:center;justify-content:center;cursor:pointer;border:none">\u00d7</button>
  <video id="videoPub" controls playsinline style="max-width:90vw;max-height:80vh;border-radius:8px;background:#000"></video>
</div>
${getFooter()}
<script type="application/ld+json">${schema}<\/script>
<script>
document.querySelectorAll('.tab').forEach(function(btn){
  btn.addEventListener('click',function(){
    document.querySelectorAll('.tab-content').forEach(function(t){t.classList.remove('active')});
    document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active')});
    document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
    btn.classList.add('active');
  });
});
var SB_URL='${SB_URL}',SB_KEY='${SB_KEY}',LISTING_ID=${l.id};
async function sendMessage(){
  var n=document.getElementById('cfName').value.trim();
  var p=document.getElementById('cfPhone').value.trim();
  var m=document.getElementById('cfMsg').value.trim();
  if(!n||!p){alert('Please enter your name and phone number.');return;}
  try{
    var res=await fetch(SB_URL+'/rest/v1/leads',{method:'POST',headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({listing_id:LISTING_ID,sender_name:n,sender_phone:p,sender_message:m||null})});
    if(!res.ok)throw new Error('Failed');
    document.querySelector('.contact-card').innerHTML='<div style="text-align:center;padding:2rem;color:var(--ac)"><h3 style="font-family:var(--se);margin-bottom:.5rem">\\u2713 Message Sent!</h3><p style="color:#666;font-size:.875rem">The artist will reach out to you shortly.</p></div>';
  }catch(e){console.error(e);alert('Something went wrong. Please try again.');}
}
function trackBooking(){
  fetch(SB_URL+'/rest/v1/page_views',{method:'POST',headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({listing_id:LISTING_ID,path:'/booking-click'})}).catch(function(){});
}
var lbMedia=${lbData};var lbIdx=0;
function openLb(idx){if(!lbMedia.length)return;lbIdx=idx||0;document.getElementById('lbImg').src=lbMedia[lbIdx].url;document.getElementById('lbCounter').textContent=(lbIdx+1)+' / '+lbMedia.length;document.getElementById('lightbox').classList.add('open');document.body.style.overflow='hidden';}
function closeLb(){document.getElementById('lightbox').classList.remove('open');document.body.style.overflow='';}
function lbNav(dir){lbIdx=(lbIdx+dir+lbMedia.length)%lbMedia.length;document.getElementById('lbImg').src=lbMedia[lbIdx].url;document.getElementById('lbCounter').textContent=(lbIdx+1)+' / '+lbMedia.length;}
function openVideoLb(src){var v=document.getElementById('videoPub');v.src=src;document.getElementById('videoModal').style.display='flex';document.body.style.overflow='hidden';v.play().catch(function(){});}
function closeVideoLb(){var v=document.getElementById('videoPub');v.pause();v.src='';document.getElementById('videoModal').style.display='none';document.body.style.overflow='';}
document.querySelectorAll('.obf-email').forEach(function(el){var u=el.dataset.u,d=el.dataset.d;if(u&&d){var addr=u+'@'+d;el.innerHTML='<a href="mai'+'lto:'+addr+'">'+addr+'</a>';}});
document.querySelectorAll('.obf-phone').forEach(function(el){var a=el.dataset.a,b=el.dataset.b,c=el.dataset.c;if(a){var num=a+b+c;var display=a.length>=3?'('+a+') '+b+'-'+c:num;el.innerHTML='<a href="t'+'el:'+num+'">'+display+'</a>';}});
document.querySelectorAll('.obf-call').forEach(function(el){var a=el.dataset.a,b=el.dataset.b,c=el.dataset.c;if(a){var num=a+b+c;el.href='t'+'el:'+num;}});
document.addEventListener('click',function(e){var d=document.getElementById('navDD');if(d&&!d.contains(e.target))d.classList.remove('open')});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeLb();closeVideoLb();}if(document.getElementById('lightbox').classList.contains('open')){if(e.key==='ArrowLeft')lbNav(-1);if(e.key==='ArrowRight')lbNav(1);}});
<\/script>
</body>
</html>`;
}
