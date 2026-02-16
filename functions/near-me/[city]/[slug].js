import { getHead, getNav, getFooter, esc, citySlug, listingUrl } from '../../../templates/shared.js';

const SB_URL = 'https://ingorrzmoudvoknhwjjb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc';

// Strip phone to digits, then format as (XXX) XXX-XXXX if 10 digits
function fmtPhone(raw) {
  if (!raw) return { digits: '', display: '', a: '', b: '', c: '' };
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return { digits, display: `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`, a: digits.slice(0,3), b: digits.slice(3,6), c: digits.slice(6) };
  }
  return { digits, display: raw, a: digits.slice(0,3), b: digits.slice(3,6), c: digits.slice(6) };
}

function mediaUrl(m) {
  const bucket = m.is_placeholder ? 'placeholders' : 'media';
  return SB_URL + '/storage/v1/object/public/' + bucket + '/' + m.storage_path;
}

export async function onRequestGet(context) {
  try {
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

  // Fetch media, reviews, and products in parallel
  const [mediaRes, reviewsRes, productsRes] = await Promise.all([
    fetch(
      `${SB_URL}/rest/v1/media?listing_id=eq.${l.id}&select=*&order=sort_order.asc`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    ),
    fetch(
      `${SB_URL}/rest/v1/reviews?listing_id=eq.${l.id}&status=eq.approved&select=*&order=created_at.desc${isPromoted ? '&limit=50' : '&limit=5'}`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    ),
    fetch(
      `${SB_URL}/rest/v1/products?listing_id=eq.${l.id}&order=sort_order.asc&select=*`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    )
  ]);
  const media = await mediaRes.json() || [];
  const reviews = await reviewsRes.json() || [];
  const products = await productsRes.json() || [];

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

  const html = isPromoted ? renderPremiumPage(l, media, reviews, products) : renderDetailPage(l, media, reviews, products);
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600'
    }
  });
  } catch (err) {
    return new Response(`<html><body><h1>Error</h1><pre>${err.stack || err.message}</pre></body></html>`, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

function starsHtml(n) {
  return '<span style="color:#F59E0B">' + '\u2605'.repeat(n) + '</span>' +
         '<span style="color:var(--bd)">' + '\u2605'.repeat(5 - n) + '</span>';
}

function renderDetailPage(l, allMedia, reviews, products) {
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

  const phone = fmtPhone(l.phone);

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

  // Services list for slide panel
  const svcJSON = JSON.stringify((l.services || []).map(s => s));
  const basicListingUrl = `/near-me/${cs}/${l.slug}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
${getHead(title, desc, canonical, ogImage)}
<style>.dp-booking{display:inline-block;padding:.625rem 1.25rem;background:var(--ac);color:#fff;border-radius:var(--rs);font-size:.875rem;font-weight:500;margin-top:.75rem;transition:background .15s}.dp-booking:hover{background:var(--ac2);color:#fff}.dp-rating{margin-top:.375rem}.dp-badge{display:inline-flex;align-items:center;gap:.375rem;font-size:.8125rem;font-weight:600}.dp-badge-verified{color:var(--ac)}.dp-badge-featured{color:#D4A853}.dp-cta{display:flex;gap:.5rem;margin-top:.75rem}.dp-cta-btn{display:inline-flex;align-items:center;gap:.375rem;padding:.5rem 1rem;border-radius:var(--rs);font-size:.8125rem;font-weight:500;cursor:pointer;border:none;font-family:var(--f);transition:all .15s}.dp-cta-msg{background:var(--al);color:var(--ac)}.dp-cta-msg:hover{background:var(--ac);color:#fff}.dp-cta-call{background:var(--ac);color:#fff;text-decoration:none}.dp-cta-call:hover{background:var(--ac2);color:#fff}.sticky-cta-bar{position:fixed;top:56px;left:0;right:0;z-index:90;background:rgba(250,250,248,.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--bd);padding:6px 1rem;display:none;align-items:center;justify-content:center;gap:.5rem;max-width:100%}.sticky-cta-bar.visible{display:flex}.sticky-cta-bar .dp-cta-btn{flex:1;justify-content:center;padding:.5rem}${getPostsCSS()}${products.length ? getShopCSS() : ''}</style>
<script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"><\/script>
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
      <div class="dp-cta" id="ctaButtons">
        <button class="dp-cta-btn dp-cta-msg" onclick="openMsgPanel()">\uD83D\uDCAC Message</button>
        ${l.phone ? `<a class="dp-cta-btn dp-cta-call obf-call" data-a="${esc(phone.a)}" data-b="${esc(phone.b)}" data-c="${esc(phone.c)}">\uD83D\uDCDE Call</a>` : ''}
      </div>
      ${bookingHTML}
    </div>
  </div>

  <div class="dp-section"><h3>About</h3><p class="dp-about">${esc(l.about || '')}</p></div>

  <div class="dp-section"><h3>Services Offered</h3><div class="dp-svcs">${services}</div></div>

  <div class="dp-section"><h3>Contact Information</h3><div class="dp-grid">
    <div class="dp-det"><label>Phone</label><span class="obf-phone" data-a="${esc(phone.a)}" data-b="${esc(phone.b)}" data-c="${esc(phone.c)}">${esc(phone.display)}</span></div>
    <div class="dp-det"><label>Email</label><span class="obf-email" data-u="${esc((l.email || '').split('@')[0] || '')}" data-d="${esc((l.email || '').split('@')[1] || '')}">${l.email ? esc((l.email || '').split('@')[0]) + ' [at] ' + esc(((l.email || '').split('@')[1] || '').replace(/\./g, ' [dot] ')) : ''}</span></div>
    <div class="dp-det"><label>Website</label><a href="${esc(l.website || '')}" target="_blank" rel="noopener">${esc((l.website || '').replace(/https?:\/\//, ''))}</a></div>
    <div class="dp-det"><label>Location</label><span>${esc(l.city)}, ${esc(l.state)} ${esc(l.zip || '')}</span></div>
  </div></div>

  <div class="dp-section"><h3>Gallery</h3><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${gallery}</div><p style="font-size:.75rem;color:var(--t3);margin-top:.5rem;text-align:center">${l.claimed ? '' : 'Photos will appear when this business claims their page'}</p></div>

  ${products.length ? `<div class="dp-section"><h3>\uD83D\uDED2 Shop</h3><div class="shop-grid">${products.map((p, i) => {
    const pMedia = allMedia.find(m => m.product_id === p.id);
    const imgSrc = pMedia ? mediaUrl(pMedia) : '';
    const cat = (p.category || 'other').charAt(0).toUpperCase() + (p.category || 'other').slice(1);
    return `<div class="shop-card" onclick="openProduct(${i})"><div class="shop-img">${imgSrc ? `<img src="${imgSrc}" alt="${esc(p.name)}" loading="lazy">` : '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#ccc;font-size:2.5rem">\uD83D\uDCE6</div>'}</div><div class="shop-body"><div class="shop-cat">${esc(cat)}</div><div class="shop-name">${esc(p.name)}</div><div class="shop-row"><span class="shop-price">$${parseFloat(p.price).toFixed(2)}</span><span class="shop-view">View</span></div><div class="shop-stock"><span class="stock-dot" style="background:${p.in_stock ? '#059669' : '#DC2626'}"></span>${p.in_stock ? 'In Stock' : 'Out of Stock'}</div></div></div>`;
  }).join('')}</div></div>` : ''}

  ${reviewsHTML}

  ${!l.claimed ? `<div class="dp-claim"><span style="flex:1">Claim this page to get verified and manage your listing.</span><button onclick="location.href='/signup.html?claim=${esc(l.slug)}'">Claim Page</button></div>` : ''}
</div>

<!-- Sticky CTA bar -->
<div class="sticky-cta-bar" id="stickyCta">
  <button class="dp-cta-btn dp-cta-msg" onclick="openMsgPanel()">\uD83D\uDCAC Message</button>
  ${l.phone ? `<a class="dp-cta-btn dp-cta-call obf-call" data-a="${esc(phone.a)}" data-b="${esc(phone.b)}" data-c="${esc(phone.c)}">\uD83D\uDCDE Call</a>` : ''}
</div>

<!-- Slide-out message panel -->
<div class="msg-overlay" id="msgOverlay" onclick="closeMsgPanel()"></div>
<div class="msg-panel" id="msgPanel">
  <div class="msg-panel-head"><h3>Message ${esc(l.name)}</h3><button onclick="closeMsgPanel()" style="background:none;border:none;font-size:1.25rem;cursor:pointer;color:var(--t3)">\u00d7</button></div>
  <div class="msg-panel-body" id="msgPanelBody">
    <label class="mp-label">Name *</label>
    <input type="text" id="mpName" placeholder="Your name">
    <label class="mp-label">Phone *</label>
    <input type="tel" id="mpPhone" placeholder="(555) 123-4567">
    <label class="mp-label">Message</label>
    <textarea id="mpMsg" placeholder="Hi, I'm interested in learning more about your SMP services..."></textarea>
    <label class="mp-label">Services interested in</label>
    <div class="msg-svcs" id="mpSvcs"></div>
    <label class="msg-consent"><input type="checkbox" id="mpConsent"> I agree to receive SMS/text messages regarding my inquiry.</label>
    <button class="msg-submit" onclick="sendMessage()">Send Message \u2192</button>
  </div>
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

${getPostsHTML(l, ini, profilePhoto ? mediaUrl(profilePhoto) : '', false)}
${products.length ? `<div class="sp-overlay" id="shopOverlay" onclick="if(event.target===this)closeProduct()">
  <div class="sp-modal" id="shopModal"></div>
</div>` : ''}
${getFooter()}

<script type="application/ld+json">${schema}</script>

<script>
const SB_URL='${SB_URL}';
const SB_KEY='${SB_KEY}';
const LISTING_ID=${l.id};
var LISTING_SVCS=${svcJSON};
var CLAIMED_BY_ID='${(l.claimed_by||'').replace(/'/g,"\\'")}';
function escH(s){return s?s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''}

// Slide-out message panel
function openMsgPanel(){
  var sc=document.getElementById('mpSvcs');sc.innerHTML='';
  LISTING_SVCS.forEach(function(s){var d=document.createElement('span');d.className='msg-svc';d.textContent=s;d.onclick=function(){d.classList.toggle('on')};sc.appendChild(d);});
  document.getElementById('msgOverlay').classList.add('open');document.getElementById('msgPanel').classList.add('open');document.body.style.overflow='hidden';
}
function closeMsgPanel(){document.getElementById('msgOverlay').classList.remove('open');document.getElementById('msgPanel').classList.remove('open');document.body.style.overflow='';}
async function sendMessage(){
  var n=document.getElementById('mpName').value.trim();
  var p=document.getElementById('mpPhone').value.trim();
  var m=document.getElementById('mpMsg').value.trim();
  if(!n||!p){alert('Please enter your name and phone number.');return;}
  var selSvcs=[];document.querySelectorAll('#mpSvcs .msg-svc.on').forEach(function(s){selSvcs.push(s.textContent)});
  var consent=document.getElementById('mpConsent').checked;
  try{
    var res=await fetch(SB_URL+'/rest/v1/leads',{method:'POST',headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({listing_id:LISTING_ID,sender_name:n,sender_phone:p,sender_message:m||null,services_interested:selSvcs.length?selSvcs:null,sms_consent:consent})});
    if(!res.ok)throw new Error('Failed');
    document.getElementById('msgPanelBody').innerHTML='<div class="msg-ok"><h4>\\u2713 Message Sent!</h4><p>The artist will reach out to you shortly.</p><button onclick="closeMsgPanel()" style="margin-top:1rem;padding:.5rem 1.5rem;background:var(--ac);color:#fff;border:none;border-radius:var(--rs);cursor:pointer;font-family:var(--f)">Close</button></div>';
  }catch(e){console.error(e);alert('Something went wrong. Please try again.');}
}

// Track booking click
function trackBooking(){
  fetch(SB_URL+'/rest/v1/page_views',{method:'POST',headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({listing_id:LISTING_ID,path:'/booking-click'})}).catch(function(){});
}

// Sticky CTA bar
(function(){
  var ctaEl=document.getElementById('ctaButtons');
  var stickyBar=document.getElementById('stickyCta');
  if(ctaEl&&stickyBar){
    var obs=new IntersectionObserver(function(entries){
      entries.forEach(function(e){stickyBar.classList.toggle('visible',!e.isIntersecting);});
    },{threshold:0});
    obs.observe(ctaEl);
  }
})();

// Owner nav — swap dropdown menu items, keep Near Me + dropdown button
(function(){
  if(!CLAIMED_BY_ID)return;
  function setupOwnerNav(){
    var sb=window._sbc||null;
    if(!sb&&window.supabase)sb=window.supabase.createClient(SB_URL,SB_KEY);
    if(!sb)return;
    sb.auth.getUser().then(function(r){
      if(r.data&&r.data.user&&r.data.user.id===CLAIMED_BY_ID){
        var menu=document.querySelector('#navDD .nav-menu');
        if(menu){
          menu.innerHTML='<a href="${basicListingUrl}">View Page</a><a href="/dashboard.html">Edit Page</a><div class="nm-sep"></div><a href="#" onclick="event.preventDefault();(window._sbc||window.supabase.createClient(\\''+SB_URL+'\\',\\''+SB_KEY+'\\')).auth.signOut().then(function(){location.reload()})">Sign Out</a>';
        }
        // Also update mobile drawer
        var mob=document.querySelector('.mob-drawer nav');
        if(mob){
          mob.innerHTML='<a href="/near-me/">Near Me</a><a href="${basicListingUrl}">View Page</a><a href="/dashboard.html">Edit Page</a><a href="#" onclick="event.preventDefault();(window._sbc||window.supabase.createClient(\\''+SB_URL+'\\',\\''+SB_KEY+'\\')).auth.signOut().then(function(){location.reload()})">Sign Out</a>';
        }
      }
    }).catch(function(){});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(setupOwnerNav,100)});
  else setTimeout(setupOwnerNav,100);
})();

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

// Obfuscate contact info
document.querySelectorAll('.obf-email').forEach(function(el){
  var u=el.dataset.u,d=el.dataset.d;
  if(u&&d){var addr=u+'@'+d;el.innerHTML='<a href="mai'+'lto:'+addr+'">'+addr+'</a>';}
});
document.querySelectorAll('.obf-phone').forEach(function(el){var a=el.dataset.a,b=el.dataset.b,c=el.dataset.c;if(a){var num=a+b+c;var display=num.length===10?'('+num.slice(0,3)+') '+num.slice(3,6)+'-'+num.slice(6):num;el.innerHTML='<a href="t'+'el:'+num+'">'+display+'</a>';}});
document.querySelectorAll('.obf-call').forEach(function(el){var a=el.dataset.a,b=el.dataset.b,c=el.dataset.c;if(a){var num=a+b+c;el.href='t'+'el:'+num;}});

document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){closeLb();closeVideoLb();closeCompose();closeMsgPanel();if(typeof closeProduct==='function')closeProduct();}
  if(document.getElementById('lightbox').classList.contains('open')){
    if(e.key==='ArrowLeft')lbNav(-1);
    if(e.key==='ArrowRight')lbNav(1);
  }
});
${getPostsJS(l, ini, profilePhoto ? mediaUrl(profilePhoto) : '', false)}
${products.length ? getShopJS(l, products, allMedia) : ''}
</script>
</body>
</html>`;
}

function renderPremiumPage(l, allMedia, reviews, products) {
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

  const phone = fmtPhone(l.phone);

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
  let ctaHTML = '<a class="cta-btn cta-secondary" onclick="openMsgPanel()">\uD83D\uDCAC Message</a>';
  if (l.booking_type === 'external' && l.booking_url) {
    ctaHTML += `<a href="${esc(l.booking_url)}" target="_blank" rel="noopener" class="cta-btn cta-primary" onclick="trackBooking()">\uD83D\uDCC5 Book</a>`;
  }
  if (l.phone) {
    ctaHTML += `<a class="cta-btn cta-primary obf-call" data-a="${esc(phone.a)}" data-b="${esc(phone.b)}" data-c="${esc(phone.c)}">\uD83D\uDCDE Call</a>`;
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

  const premiumCSS = `.hero{position:relative;width:100%;max-width:none;height:420px;overflow:hidden;margin:0;padding:0;text-align:left}.hero-img{width:100%;height:100%;object-fit:cover;display:block}.hero-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.3) 0%,transparent 40%,transparent 50%,rgba(0,0,0,.45) 100%)}.hero-nav{position:absolute;top:0;left:0;right:0;z-index:10}.hero-nav-inner{max-width:1200px;margin:0 auto;padding:1.25rem 2rem;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,.5)}.hero-nav .logo{font-family:var(--se);font-size:1.4rem;color:#fff;text-decoration:none;text-shadow:0 1px 4px rgba(0,0,0,.3)}.hero-nav .logo span{color:#a8d4b8}.hero-nav .nav-r{display:flex;gap:1.25rem;align-items:center}.hero-nav .nav-r a{color:rgba(255,255,255,.9);font-size:.875rem;text-decoration:none;text-shadow:0 1px 4px rgba(0,0,0,.3)}.profile-header{width:100%;max-width:1200px;margin:0 auto;padding:0 2rem;position:relative}.profile-avatar{width:120px;height:120px;border-radius:16px;border:4px solid #FAFAF8;overflow:hidden;margin-top:-60px;position:relative;z-index:20;background:#2D5A3D;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.12)}.profile-avatar img{width:100%;height:100%;object-fit:cover}.profile-avatar .initials{color:#fff;font-family:var(--se);font-size:2rem;font-weight:700}.profile-meta{display:flex;align-items:flex-start;justify-content:space-between;margin-top:1rem;gap:1.5rem;flex-wrap:wrap}.profile-left{flex:1;min-width:280px}.profile-right{display:flex;gap:.75rem;flex-shrink:0;align-items:flex-start;padding-top:.25rem}.profile-name{font-family:var(--se);font-size:2.25rem;line-height:1.15;display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}.badge-verified{display:inline-flex;align-items:center;gap:4px;background:#F0F5F0;color:#2D5A3D;padding:4px 12px;border-radius:20px;font-size:.75rem;font-weight:600;font-family:var(--f)}.badge-featured{display:inline-flex;align-items:center;gap:4px;background:#FFF8E7;color:#B8860B;padding:4px 12px;border-radius:20px;font-size:.75rem;font-weight:600;font-family:var(--f);border:1px solid #E8D5A3}.profile-location{color:#666;font-size:.9375rem;margin-top:6px;display:flex;align-items:center;gap:6px}.profile-tagline{color:#444;font-size:1rem;margin-top:.5rem;line-height:1.5;max-width:600px}.profile-rating{display:flex;align-items:center;gap:8px;margin-top:.75rem}.stars{color:#D4A853;font-size:1.1rem;letter-spacing:1px}.rating-text{color:#666;font-size:.875rem}.profile-socials{display:flex;gap:.625rem;margin-top:.875rem;flex-wrap:wrap}.social-pill{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--bd);padding:5px 14px;border-radius:20px;font-size:.8125rem;color:#555;text-decoration:none;background:#fff;transition:all .2s}.social-pill:hover{border-color:var(--ac);color:var(--ac);background:#F0F5F0}.cta-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 28px;border-radius:12px;font-size:.9375rem;font-weight:600;text-decoration:none;cursor:pointer;transition:all .2s;font-family:var(--f);border:none}.cta-primary{background:var(--ac);color:#fff}.cta-primary:hover{background:var(--ac2)}.cta-secondary{background:#fff;color:var(--ac);border:2px solid var(--ac)}.cta-secondary:hover{background:#F0F5F0}.content-area{width:100%;max-width:1200px;margin:0 auto;padding:0 2rem}.tabs{display:flex;gap:0;border-bottom:2px solid var(--bd);margin-top:2rem}.tab{padding:.875rem 1.5rem;font-size:.9375rem;font-weight:500;color:#888;cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all .2s;background:none;border-top:none;border-left:none;border-right:none;font-family:var(--f)}.tab.active{color:var(--ac);border-bottom-color:var(--ac);font-weight:600}.tab:hover{color:var(--ac)}.tab-content{display:none;padding:2rem 0 3rem}.tab-content.active{display:block}.section-label{font-size:.6875rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#888;margin-bottom:.75rem}.gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.gallery-item{aspect-ratio:1;border-radius:12px;overflow:hidden;cursor:pointer;position:relative}.gallery-item img{width:100%;height:100%;object-fit:cover;transition:transform .3s}.gallery-item:hover img{transform:scale(1.05)}.gallery-item .play-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.2)}.gallery-item .play-btn{width:48px;height:48px;background:rgba(255,255,255,.9);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.25rem}.gallery-count{display:flex;align-items:center;gap:6px;color:#888;font-size:.8125rem;margin-bottom:1rem}.about-section{margin-bottom:2.5rem}.about-text{font-size:1rem;line-height:1.75;color:#444;max-width:800px}.services-grid{display:flex;flex-wrap:wrap;gap:10px;margin-top:.5rem}.service-tag{background:#F0F5F0;color:var(--ac);padding:8px 18px;border-radius:24px;font-size:.875rem;font-weight:500}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-top:.5rem}.info-item .info-label{font-size:.6875rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#888;margin-bottom:4px}.info-item .info-val{font-size:.9375rem;color:var(--text)}.info-item .info-val a{color:var(--ac);text-decoration:none}.info-item .info-val a:hover{text-decoration:underline}.reviews-summary{display:flex;align-items:center;gap:2rem;margin-bottom:2rem;padding:1.5rem;background:#fff;border:1px solid var(--bd);border-radius:16px}.reviews-big-num{font-family:var(--se);font-size:3.5rem;line-height:1}.reviews-breakdown{flex:1}.breakdown-row{display:flex;align-items:center;gap:8px;margin-bottom:4px}.breakdown-row .num{font-size:.75rem;color:#888;width:12px;text-align:right}.breakdown-bar{flex:1;height:6px;background:var(--bd);border-radius:3px;overflow:hidden}.breakdown-fill{height:100%;background:#D4A853;border-radius:3px}.breakdown-count{font-size:.75rem;color:#888;width:20px}.review-card{background:#fff;border:1px solid var(--bd);border-radius:16px;padding:1.5rem;margin-bottom:1rem}.review-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.75rem}.reviewer-name{font-weight:600;font-size:.9375rem}.review-date{color:#888;font-size:.8125rem}.review-stars{color:#D4A853;margin-bottom:.5rem;font-size:.875rem}.review-body{color:#444;font-size:.9375rem;line-height:1.6}.review-reply{margin-top:1rem;padding:1rem;background:#F5F4F0;border-radius:12px;font-size:.875rem}.review-reply-label{font-weight:600;font-size:.8125rem;color:var(--ac);margin-bottom:4px}.location-card{background:#fff;border:1px solid var(--bd);border-radius:16px;padding:1.5rem}.location-address{font-size:1.0625rem;line-height:1.6;margin-bottom:1rem}.map-placeholder{width:100%;height:300px;background:var(--bd);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#888;font-size:.875rem}.p-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:300;display:none;align-items:center;justify-content:center;flex-direction:column}.p-lightbox.open{display:flex}.p-lightbox img{max-width:90vw;max-height:80vh;object-fit:contain;border-radius:8px}.p-lb-close{position:absolute;top:1rem;right:1.5rem;color:#fff;font-size:2rem;cursor:pointer;background:none;border:none;z-index:301}.p-lb-nav{position:absolute;top:50%;color:#fff;font-size:2rem;cursor:pointer;background:rgba(255,255,255,.15);border:none;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;transform:translateY(-50%)}.p-lb-prev{left:1rem}.p-lb-next{right:1rem}.p-lb-counter{color:rgba(255,255,255,.6);font-size:.8125rem;margin-top:1rem}@media(max-width:768px){.hero{height:280px}.profile-avatar{width:96px;height:96px;border-radius:14px;margin-top:-48px}.profile-name{font-size:1.625rem}.profile-meta{flex-direction:column}.profile-right{width:100%}.profile-right .cta-btn{flex:1}.tabs{overflow-x:auto;-webkit-overflow-scrolling:touch}.tab{white-space:nowrap;padding:.75rem 1rem;font-size:.875rem}.info-grid{grid-template-columns:1fr}.gallery-grid{grid-template-columns:repeat(2,1fr)}.form-row{grid-template-columns:1fr}.reviews-summary{flex-direction:column;text-align:center}.hero-nav-inner{padding:1rem 1rem}}@media(max-width:480px){.hero{height:220px}.profile-avatar{width:80px;height:80px;border-radius:12px;margin-top:-40px}.profile-name{font-size:1.375rem}.gallery-grid{grid-template-columns:repeat(2,1fr);gap:8px}}.hero-nav-gradient{position:absolute;top:0;left:0;right:0;height:80px;background:linear-gradient(to bottom,rgba(0,0,0,.6) 0%,rgba(0,0,0,.3) 50%,transparent 100%);z-index:5;pointer-events:none}.hero-nav .nav-dd{position:relative}.hero-nav .nav-dd-btn{background:#fff;color:#2D5A3D;padding:7px 14px;border-radius:8px;font-weight:600;font-size:.8125rem;display:inline-flex;align-items:center;gap:.375rem;cursor:pointer;border:none;font-family:var(--f);transition:background .15s;text-shadow:none}.hero-nav .nav-dd-btn:hover{background:rgba(255,255,255,.9)}.hero-nav .nav-dd-btn svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2.5;transition:transform .2s}.hero-nav .nav-dd.open .nav-dd-btn svg{transform:rotate(180deg)}.hero-nav .nav-menu{display:none;position:absolute;right:0;top:calc(100% + 6px);background:#fff;border:1px solid var(--bd);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.15);min-width:200px;padding:.375rem;z-index:110}.hero-nav .nav-dd.open .nav-menu{display:block}.hero-nav .nav-menu a{display:block;padding:.5rem .75rem;border-radius:6px;font-size:.875rem;color:#1A1A1A;font-weight:400;text-decoration:none;text-shadow:none;transition:background .1s}.hero-nav .nav-menu a:hover{background:#F0F5F0}.hero-nav .nm-sep{height:1px;background:var(--bd);margin:.25rem .75rem}`;

  // Services list for slide panel
  const svcJSON = JSON.stringify((l.services || []).map(s => s));
  const listingUrl = `/near-me/${cs}/${l.slug}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
${getHead(title, desc, canonical, ogImage)}
<style>${premiumCSS}
.sticky-cta-bar{position:fixed;top:0;left:0;right:0;z-index:90;background:rgba(250,250,248,.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--bd);padding:8px 2rem;display:none;align-items:center;justify-content:center;gap:.75rem}
.sticky-cta-bar.visible{display:flex}
.sticky-cta-bar .cta-btn{padding:8px 20px;font-size:.8125rem}
.msg-overlay{display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.4)}.msg-overlay.open{display:block}
.msg-panel{position:fixed;top:0;right:-420px;width:400px;max-width:90vw;height:100vh;background:var(--card);z-index:201;box-shadow:-4px 0 20px rgba(0,0,0,.1);transition:right .3s ease;display:flex;flex-direction:column;overflow:hidden}.msg-panel.open{right:0}
.msg-panel-head{padding:1.25rem;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between}.msg-panel-head h3{font-size:1rem;font-weight:700}
.msg-panel-body{flex:1;overflow-y:auto;padding:1.25rem}
.msg-panel-body label.mp-label{display:block;font-size:.8125rem;font-weight:500;margin-bottom:.25rem;color:var(--text)}
.msg-panel-body input[type="text"],.msg-panel-body input[type="tel"],.msg-panel-body textarea{width:100%;padding:.625rem .75rem;border:1px solid var(--bd);border-radius:var(--rs);outline:none;font-size:.875rem;margin-bottom:.75rem;transition:border-color .15s;font-family:var(--f);background:#fff}
.msg-panel-body input:focus,.msg-panel-body textarea:focus{border-color:var(--ac)}
.msg-panel-body textarea{resize:vertical;min-height:80px}
.msg-svcs{display:flex;flex-wrap:wrap;gap:.375rem;margin-bottom:.75rem}
.msg-svc{font-size:.75rem;padding:.25rem .625rem;border:1px solid var(--bd);border-radius:20px;cursor:pointer;transition:all .15s;background:var(--card);color:var(--t2)}.msg-svc.on{border-color:var(--ac);background:var(--al);color:var(--ac)}
.msg-consent{display:flex;align-items:flex-start;gap:.5rem;margin-bottom:1rem;font-size:.75rem;color:var(--t2)}.msg-consent input[type="checkbox"]{margin-top:2px;flex-shrink:0}
.msg-submit{width:100%;padding:.75rem;background:var(--ac);color:#fff;border-radius:var(--rs);font-weight:600;font-size:.875rem;transition:background .15s;cursor:pointer;border:none;font-family:var(--f)}.msg-submit:hover{background:var(--ac2)}
.msg-ok{text-align:center;padding:2rem 1rem}.msg-ok h4{font-size:1.125rem;margin-bottom:.5rem;color:var(--ac)}.msg-ok p{color:var(--t2);font-size:.875rem}

${getPostsCSS()}
${products.length ? getShopCSS() : ''}</style>
<script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"><\/script>
</head>
<body>
<div class="hero">
  ${coverHTML}
  <div class="hero-overlay"></div>
  <div class="hero-nav-gradient"></div>
  <nav class="hero-nav">
    <div class="hero-nav-inner">
      <a href="/" class="logo">Hair<span>Tattoo</span></a>
      <div class="nav-r" id="navRight">
        <a href="/near-me/">Near Me</a>
        <a href="/marketplace.html">Marketplace</a>
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
    <div class="profile-right" id="ctaButtons">${ctaHTML}</div>
  </div>
</div>
<div class="sticky-cta-bar" id="stickyCta">
  <a class="cta-btn cta-secondary" onclick="openMsgPanel()" style="flex:1;text-align:center">\uD83D\uDCAC Message</a>
  ${l.phone ? `<a class="cta-btn cta-primary obf-call" data-a="${esc(phone.a)}" data-b="${esc(phone.b)}" data-c="${esc(phone.c)}" style="flex:1;text-align:center">\uD83D\uDCDE Call</a>` : ''}
</div>
<div class="content-area">
  <div class="tabs">
    <button class="tab active" data-tab="posts">Posts</button>
    ${products.length ? '<button class="tab" data-tab="shop">\uD83D\uDED2 Shop</button>' : ''}
    <button class="tab" data-tab="about">About</button>
    <button class="tab" data-tab="reviews">Reviews</button>
    <button class="tab" data-tab="location">Location</button>
  </div>
  <div class="tab-content active" id="tab-posts">
    <div class="posts-toggle"><div class="toggle-group"><button class="toggle-btn active" data-view="feed" onclick="setPostsView('feed')">\uD83D\uDCF0 Posts</button><button class="toggle-btn" data-view="grid" onclick="setPostsView('grid')">\uD83D\uDCF7 Gallery</button></div><span class="posts-count" id="postsCount"></span></div>
    <div id="postsContainer"><div style="text-align:center;padding:3rem;color:#888">Loading posts...</div></div>
  </div>
  ${products.length ? `<div class="tab-content" id="tab-shop">
    <div class="section-label">\uD83D\uDED2 ${products.length} PRODUCT${products.length !== 1 ? 'S' : ''}</div>
    <div class="shop-grid">${products.map((p, i) => {
      const pMedia = allMedia.find(m => m.product_id === p.id);
      const imgSrc = pMedia ? mediaUrl(pMedia) : '';
      const cat = (p.category || 'other').charAt(0).toUpperCase() + (p.category || 'other').slice(1);
      return `<div class="shop-card" onclick="openProduct(${i})"><div class="shop-img">${imgSrc ? `<img src="${imgSrc}" alt="${esc(p.name)}" loading="lazy">` : '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#ccc;font-size:2.5rem">\uD83D\uDCE6</div>'}</div><div class="shop-body"><div class="shop-cat">${esc(cat)}</div><div class="shop-name">${esc(p.name)}</div><div class="shop-row"><span class="shop-price">$${parseFloat(p.price).toFixed(2)}</span><span class="shop-view">View</span></div><div class="shop-stock"><span class="stock-dot" style="background:${p.in_stock ? '#059669' : '#DC2626'}"></span>${p.in_stock ? 'In Stock' : 'Out of Stock'}</div></div></div>`;
    }).join('')}</div>
  </div>` : ''}
  <div class="tab-content" id="tab-about">
    ${servicesHTML ? `<div class="about-section"><div class="section-label">SERVICES OFFERED</div><div class="services-grid">${servicesHTML}</div></div>` : ''}
    ${l.about ? `<div class="about-section"><div class="section-label">ABOUT</div><p class="about-text">${esc(l.about).replace(/\n/g, '<br>')}</p></div>` : ''}
    <div class="about-section">
      <div class="section-label">CONTACT INFORMATION</div>
      <div class="info-grid">
        <div class="info-item"><div class="info-label">PHONE</div><div class="info-val"><span class="obf-phone" data-a="${esc(phone.a)}" data-b="${esc(phone.b)}" data-c="${esc(phone.c)}">${esc(phone.display)}</span></div></div>
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
<!-- Slide-out message panel -->
<div class="msg-overlay" id="msgOverlay" onclick="closeMsgPanel()"></div>
<div class="msg-panel" id="msgPanel">
  <div class="msg-panel-head"><h3>Message ${esc(l.name)}</h3><button onclick="closeMsgPanel()" style="background:none;border:none;font-size:1.25rem;cursor:pointer;color:var(--t3)">\u00d7</button></div>
  <div class="msg-panel-body" id="msgPanelBody">
    <label class="mp-label">Name *</label>
    <input type="text" id="mpName" placeholder="Your name">
    <label class="mp-label">Phone *</label>
    <input type="tel" id="mpPhone" placeholder="(555) 123-4567">
    <label class="mp-label">Message</label>
    <textarea id="mpMsg" placeholder="Hi, I'm interested in learning more about your SMP services..."></textarea>
    <label class="mp-label">Services interested in</label>
    <div class="msg-svcs" id="mpSvcs"></div>
    <label class="msg-consent"><input type="checkbox" id="mpConsent"> I agree to receive SMS/text messages regarding my inquiry.</label>
    <button class="msg-submit" onclick="sendMessage()">Send Message \u2192</button>
  </div>
</div>
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
${getPostsHTML(l, ini, profilePhoto ? mediaUrl(profilePhoto) : '', true)}
${products.length ? `<div class="sp-overlay" id="shopOverlay" onclick="if(event.target===this)closeProduct()">
  <div class="sp-modal" id="shopModal"></div>
</div>` : ''}
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
var LISTING_SVCS=${svcJSON};
var LISTING_URL='${listingUrl}';
var CLAIMED_BY_ID='${(l.claimed_by||'').replace(/'/g,"\\'")}';

// Slide-out message panel
function openMsgPanel(){
  var sc=document.getElementById('mpSvcs');sc.innerHTML='';
  LISTING_SVCS.forEach(function(s){var d=document.createElement('span');d.className='msg-svc';d.textContent=s;d.onclick=function(){d.classList.toggle('on')};sc.appendChild(d);});
  document.getElementById('msgOverlay').classList.add('open');document.getElementById('msgPanel').classList.add('open');document.body.style.overflow='hidden';
}
function closeMsgPanel(){document.getElementById('msgOverlay').classList.remove('open');document.getElementById('msgPanel').classList.remove('open');document.body.style.overflow='';}
async function sendMessage(){
  var n=document.getElementById('mpName').value.trim();
  var p=document.getElementById('mpPhone').value.trim();
  var m=document.getElementById('mpMsg').value.trim();
  if(!n||!p){alert('Please enter your name and phone number.');return;}
  var selSvcs=[];document.querySelectorAll('#mpSvcs .msg-svc.on').forEach(function(s){selSvcs.push(s.textContent)});
  var consent=document.getElementById('mpConsent').checked;
  try{
    var res=await fetch(SB_URL+'/rest/v1/leads',{method:'POST',headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({listing_id:LISTING_ID,sender_name:n,sender_phone:p,sender_message:m||null,services_interested:selSvcs.length?selSvcs:null,sms_consent:consent})});
    if(!res.ok)throw new Error('Failed');
    document.getElementById('msgPanelBody').innerHTML='<div class="msg-ok"><h4>\\u2713 Message Sent!</h4><p>The artist will reach out to you shortly.</p><button onclick="closeMsgPanel()" style="margin-top:1rem;padding:.5rem 1.5rem;background:var(--ac);color:#fff;border:none;border-radius:var(--rs);cursor:pointer;font-family:var(--f)">Close</button></div>';
  }catch(e){console.error(e);alert('Something went wrong. Please try again.');}
}
function trackBooking(){
  fetch(SB_URL+'/rest/v1/page_views',{method:'POST',headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({listing_id:LISTING_ID,path:'/booking-click'})}).catch(function(){});
}

// Sticky CTA bar — IntersectionObserver
(function(){
  var ctaEl=document.getElementById('ctaButtons');
  var stickyBar=document.getElementById('stickyCta');
  if(ctaEl&&stickyBar){
    var obs=new IntersectionObserver(function(entries){
      entries.forEach(function(e){stickyBar.classList.toggle('visible',!e.isIntersecting);});
    },{threshold:0});
    obs.observe(ctaEl);
  }
})();

// Owner nav — swap dropdown menu items, keep Near Me + dropdown button
(function(){
  if(!CLAIMED_BY_ID)return;
  function setupOwnerNav(){
    var sb=window._sbc||null;
    if(!sb&&window.supabase)sb=window.supabase.createClient(SB_URL,SB_KEY);
    if(!sb)return;
    sb.auth.getUser().then(function(r){
      if(r.data&&r.data.user&&r.data.user.id===CLAIMED_BY_ID){
        var menu=document.querySelector('#navDD .nav-menu');
        if(menu){
          menu.innerHTML='<a href="'+LISTING_URL+'">View Page</a><a href="/dashboard.html">Edit Page</a><div class="nm-sep"></div><a href="#" onclick="event.preventDefault();(window._sbc||window.supabase.createClient(\\''+SB_URL+'\\',\\''+SB_KEY+'\\')).auth.signOut().then(function(){location.reload()})">Sign Out</a>';
        }
      }
    }).catch(function(){});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(setupOwnerNav,100)});
  else setTimeout(setupOwnerNav,100);
})();

var lbMedia=${lbData};var lbIdx=0;
function openLb(idx){if(!lbMedia.length)return;lbIdx=idx||0;document.getElementById('lbImg').src=lbMedia[lbIdx].url;document.getElementById('lbCounter').textContent=(lbIdx+1)+' / '+lbMedia.length;document.getElementById('lightbox').classList.add('open');document.body.style.overflow='hidden';}
function closeLb(){document.getElementById('lightbox').classList.remove('open');document.body.style.overflow='';}
function lbNav(dir){lbIdx=(lbIdx+dir+lbMedia.length)%lbMedia.length;document.getElementById('lbImg').src=lbMedia[lbIdx].url;document.getElementById('lbCounter').textContent=(lbIdx+1)+' / '+lbMedia.length;}
function openVideoLb(src){var v=document.getElementById('videoPub');v.src=src;document.getElementById('videoModal').style.display='flex';document.body.style.overflow='hidden';v.play().catch(function(){});}
function closeVideoLb(){var v=document.getElementById('videoPub');v.pause();v.src='';document.getElementById('videoModal').style.display='none';document.body.style.overflow='';}
document.querySelectorAll('.obf-email').forEach(function(el){var u=el.dataset.u,d=el.dataset.d;if(u&&d){var addr=u+'@'+d;el.innerHTML='<a href="mai'+'lto:'+addr+'">'+addr+'</a>';}});
document.querySelectorAll('.obf-phone').forEach(function(el){var a=el.dataset.a,b=el.dataset.b,c=el.dataset.c;if(a){var num=a+b+c;var display=num.length===10?'('+num.slice(0,3)+') '+num.slice(3,6)+'-'+num.slice(6):num;el.innerHTML='<a href="t'+'el:'+num+'">'+display+'</a>';}});
document.querySelectorAll('.obf-call').forEach(function(el){var a=el.dataset.a,b=el.dataset.b,c=el.dataset.c;if(a){var num=a+b+c;el.href='t'+'el:'+num;}});
document.addEventListener('click',function(e){var d=document.getElementById('navDD');if(d&&!d.contains(e.target))d.classList.remove('open')});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeLb();closeVideoLb();closeCompose();closeMsgPanel();if(typeof closeProduct==='function')closeProduct();}if(document.getElementById('lightbox').classList.contains('open')){if(e.key==='ArrowLeft')lbNav(-1);if(e.key==='ArrowRight')lbNav(1);}});
${getPostsJS(l, ini, profilePhoto ? mediaUrl(profilePhoto) : '', true)}
${products.length ? getShopJS(l, products, allMedia) : ''}
<\/script>
</body>
</html>`;
}

// ── Posts System Helpers ──

function getPostsCSS() {
  return `.posts-toggle{display:flex;align-items:center;gap:12px;margin-bottom:1.25rem}.toggle-group{display:flex;background:#F0EFEB;border-radius:10px;padding:3px}.toggle-btn{padding:6px 12px;border:none;background:none;cursor:pointer;border-radius:8px;font-size:.875rem;color:#888;font-family:var(--f);transition:all .2s}.toggle-btn.active{background:#fff;color:#2D5A3D;box-shadow:0 1px 3px rgba(0,0,0,.1)}.posts-count{color:#888;font-size:.8125rem}.post-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.post-grid-item{aspect-ratio:1;border-radius:12px;overflow:hidden;cursor:pointer;position:relative}.post-grid-item img{width:100%;height:100%;object-fit:cover;transition:transform .3s}.post-grid-item:hover img{transform:scale(1.05)}.pgt{background:#F5F4F0;display:flex;align-items:center;justify-content:center;padding:1rem;text-align:center}.pgt p{font-size:.8125rem;color:#444;line-height:1.4;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.post-feed{max-width:640px}.pc{background:#fff;border:1px solid #E8E6E3;border-radius:16px;margin-bottom:1.25rem;overflow:hidden}.pc-hd{display:flex;align-items:center;gap:10px;padding:14px 16px}.pc-av{width:36px;height:36px;overflow:hidden;background:#2D5A3D;display:flex;align-items:center;justify-content:center;flex-shrink:0}.pc-av img{width:100%;height:100%;object-fit:cover}.pc-meta{flex:1;min-width:0}.pc-name{font-weight:600;font-size:.875rem}.pc-loc{font-size:.75rem;color:#888}.pc-time{font-size:.75rem;color:#999;flex-shrink:0}.pc-media{position:relative}.pm-grid{display:grid;gap:3px}.pm-grid img,.pm-grid video{width:100%;height:100%;object-fit:cover;cursor:pointer;display:block}.pm-over{position:absolute;bottom:0;right:0;width:calc(50% - 1.5px);height:calc(50% - 1.5px);background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.75rem;font-weight:700;cursor:pointer}.pc-acts{display:flex;align-items:center;gap:4px;padding:8px 16px}.pc-act{background:none;border:none;padding:6px 10px;border-radius:8px;cursor:pointer;color:#888;font-family:var(--f);display:inline-flex;align-items:center;gap:4px;font-size:.875rem;transition:background .15s}.pc-act:hover{background:#F0F5F0}.pc-act.liked{color:#E74C3C}.pc-act .pc-heart{display:inline-block;transition:transform .2s ease}@keyframes heartPop{0%{transform:scale(1)}50%{transform:scale(1.3)}100%{transform:scale(1)}}.pc-heart-pop{animation:heartPop .3s ease}.pc-cap{padding:4px 16px 14px;font-size:.875rem;line-height:1.5}.pc-cap b{font-weight:600}.pc-more{color:var(--ac);cursor:pointer;font-size:.8125rem}.pc-txt{padding:20px 16px;font-size:1rem;line-height:1.65;color:#444}.cpbar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid var(--bd);box-shadow:0 -2px 10px rgba(0,0,0,.06);z-index:101;padding:12px 16px;display:none;align-items:center;gap:12px}.cpbar .cpav{width:36px;height:36px;overflow:hidden;background:#2D5A3D;display:flex;align-items:center;justify-content:center;flex-shrink:0}.cpbar .cpav img{width:100%;height:100%;object-fit:cover}.cpbar .cpinp{flex:1;background:#F5F4F0;border:1px solid var(--bd);border-radius:20px;padding:10px 16px;font-size:.875rem;color:#888;cursor:pointer;font-family:var(--f)}.cpbar .cpinp:hover{background:#EEEDEA}.cpbar .cpbtn{width:42px;height:42px;border-radius:50%;background:#2D5A3D;border:none;color:#fff;font-size:1.5rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}.cpbar .cpbtn:hover{background:#3A7350}.cmpov{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);z-index:200;display:none;align-items:center;justify-content:center}.cmpov.open{display:flex}.cmpc{background:#fff;border-radius:20px;width:90vw;max-width:540px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden}.cmphd{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--bd)}.cmphd h3{font-family:var(--se);font-size:1.25rem;font-weight:400}.cmpx{width:32px;height:32px;border-radius:50%;border:none;background:#F5F4F0;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center}.cmpbd{flex:1;overflow-y:auto;padding:16px 20px}.cmpbd textarea{width:100%;border:none;outline:none;resize:none;font-size:1rem;font-family:var(--f);line-height:1.5;min-height:100px;color:#1A1A1A;background:transparent}.cmpbd textarea::placeholder{color:#999}.cmppv{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.cmpth{width:80px;height:80px;border-radius:8px;overflow:hidden;position:relative}.cmpth img,.cmpth video{width:100%;height:100%;object-fit:cover}.cmprm{position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;border:none;font-size:.75rem;cursor:pointer;display:flex;align-items:center;justify-content:center}.cmpft{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-top:1px solid var(--bd)}.cmpadd{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid var(--bd);border-radius:8px;background:#fff;cursor:pointer;font-size:.8125rem;color:#555;font-family:var(--f)}.cmpadd:hover{background:#F5F4F0}.cmpsubmit{padding:10px 24px;background:#2D5A3D;color:#fff;border:none;border-radius:10px;font-size:.875rem;font-weight:600;cursor:pointer;font-family:var(--f)}.cmpsubmit:hover{background:#3A7350}.cmpsubmit:disabled{opacity:.5;cursor:not-allowed}.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#2D5A3D;color:#fff;padding:12px 24px;border-radius:10px;font-size:.875rem;z-index:500;opacity:0;transition:opacity .3s}.toast.show{opacity:1}@media(max-width:768px){.post-grid{grid-template-columns:repeat(2,1fr);gap:4px}}`;
}

function getPostsHTML(l, ini, pfpUrl, isPromoted) {
  const avStyle = isPromoted ? 'border-radius:12px' : 'border-radius:50%';
  const avInner = pfpUrl
    ? `<img src="${pfpUrl}">`
    : `<span style="color:#fff;font-size:.75rem;font-weight:700">${ini}</span>`;
  return `<div class="cmpov" id="composeOverlay" onclick="if(event.target===this)closeCompose()">
  <div class="cmpc">
    <div class="cmphd"><h3>Create Post</h3><button class="cmpx" onclick="closeCompose()">&times;</button></div>
    <div class="cmpbd">
      <textarea id="composeText" placeholder="Share your latest work, tips, or studio updates..."></textarea>
      <div class="cmppv" id="composePreviews"></div>
    </div>
    <div class="cmpft">
      <button class="cmpadd" onclick="document.getElementById('composeFiles').click()">\uD83D\uDCF7 Add Photos/Video</button>
      <input type="file" id="composeFiles" multiple accept=".jpg,.jpeg,.png,.webp,.heic,.mp4,.mov,.webm" style="display:none" onchange="handleComposeFiles(this.files)">
      <button class="cmpsubmit" id="composeSubmit" onclick="submitPost()">Post</button>
    </div>
  </div>
</div>
<div class="cpbar" id="createPostBar">
  <div class="cpav" style="${avStyle}">${avInner}</div>
  <div class="cpinp" onclick="openCompose()">What&apos;s new at your studio?</div>
  <button class="cpbtn" onclick="openCompose()">+</button>
</div>
<div class="toast" id="toast"></div>`;
}

function getPostsJS(l, ini, pfpUrl, isPromoted) {
  const name = esc(l.name).replace(/'/g, "\\'");
  const city = esc(l.city).replace(/'/g, "\\'");
  const state = esc(l.state).replace(/'/g, "\\'");
  const claimedBy = (l.claimed_by || '').replace(/'/g, "\\'");
  const pfp = (pfpUrl || '').replace(/'/g, "\\'");
  const prom = isPromoted ? 'true' : 'false';

  // Shared compose + auth JS
  let js = `
var CLAIMED_BY='${claimedBy}',IS_PROMOTED=${prom},PROFILE_PHOTO='${pfp}',LISTING_NAME='${name}',LISTING_CITY='${city}',LISTING_STATE='${state}',INI='${ini}';
var allPosts=[],composeFiles=[],postsView='feed';
function getVisitorId(){var m=document.cookie.match(/ht_visitor=([^;]+)/);if(m)return m[1];var id=Math.random().toString(36).substr(2)+Date.now().toString(36);document.cookie='ht_visitor='+id+';path=/;max-age=31536000;SameSite=Lax';return id;}
var HT_VISITOR=getVisitorId(),likedSet=new Set();
function initSBC(){if(window._sbc)return window._sbc;if(window.supabase)window._sbc=window.supabase.createClient(SB_URL,SB_KEY);return window._sbc||null;}
document.addEventListener('DOMContentLoaded',function(){checkOwner();${isPromoted?'loadPosts();':''}});
async function checkOwner(){if(!CLAIMED_BY)return;var sb=initSBC();if(!sb)return;try{var r=await sb.auth.getUser();if(r.data&&r.data.user&&r.data.user.id===CLAIMED_BY)document.getElementById('createPostBar').style.display='flex';}catch(e){}}
function openCompose(){composeFiles=[];document.getElementById('composeText').value='';document.getElementById('composePreviews').innerHTML='';document.getElementById('composeOverlay').classList.add('open');document.body.style.overflow='hidden';setTimeout(function(){document.getElementById('composeText').focus()},100);}
function closeCompose(){document.getElementById('composeOverlay').classList.remove('open');document.body.style.overflow='';}
function handleComposeFiles(fl){if(!fl)return;for(var i=0;i<fl.length&&composeFiles.length<10;i++){var f=fl[i];if(!f.type.match(/^(image|video)\\//))continue;composeFiles.push(f);}renderCompPrev();document.getElementById('composeFiles').value='';}
function removeCompFile(i){composeFiles.splice(i,1);renderCompPrev();}
function renderCompPrev(){var el=document.getElementById('composePreviews');el.innerHTML='';composeFiles.forEach(function(f,i){var d=document.createElement('div');d.className='cmpth';if(f.type.startsWith('video/')){var v=document.createElement('video');v.src=URL.createObjectURL(f);v.muted=true;d.appendChild(v);}else{var im=document.createElement('img');im.src=URL.createObjectURL(f);d.appendChild(im);}var b=document.createElement('button');b.className='cmprm';b.textContent='\\u00d7';b.onclick=function(){removeCompFile(i)};d.appendChild(b);el.appendChild(d);});}
async function submitPost(){var body=document.getElementById('composeText').value.trim();if(!body&&!composeFiles.length){alert('Add some text or photos to your post.');return;}var btn=document.getElementById('composeSubmit');btn.disabled=true;btn.textContent='Posting...';var sb=initSBC();if(!sb){alert('Unable to connect. Refresh and try again.');btn.disabled=false;btn.textContent='Post';return;}try{var{data:post,error:pe}=await sb.from('posts').insert({listing_id:LISTING_ID,body:body||null}).select().single();if(pe)throw pe;for(var i=0;i<composeFiles.length;i++){var f=composeFiles[i],safe=f.name.replace(/[^a-zA-Z0-9._-]/g,''),path='listings/'+LISTING_ID+'/posts/'+post.id+'/'+Date.now()+'-'+safe;var{error:ue}=await sb.storage.from('media').upload(path,f);if(ue){console.error('Upload:',ue);continue;}var tp=f.type.startsWith('video/')?'video':'image';await sb.from('media').insert({listing_id:LISTING_ID,post_id:post.id,storage_path:path,type:tp,is_placeholder:false,is_profile:false,is_cover:false,sort_order:i});}closeCompose();showToast('Post published!');${isPromoted?'loadPosts();':''}}catch(e){console.error(e);alert('Error publishing post. Please try again.');}btn.disabled=false;btn.textContent='Post';}
function showToast(m){var el=document.getElementById('toast');el.textContent=m;el.classList.add('show');setTimeout(function(){el.classList.remove('show')},3000);}
`;

  // Premium-only: posts loading, rendering, grid/feed toggle
  if (isPromoted) {
    js += `
function murl(m){return SB_URL+'/storage/v1/object/public/'+(m.is_placeholder?'placeholders':'media')+'/'+m.storage_path;}
function relTime(d){var s=Math.floor((Date.now()-new Date(d).getTime())/1000);if(s<60)return 'just now';var m=Math.floor(s/60);if(m<60)return m+'m ago';var h=Math.floor(m/60);if(h<24)return h+'h ago';var dy=Math.floor(h/24);if(dy<7)return dy+'d ago';var w=Math.floor(dy/7);if(w<5)return w+'w ago';return new Date(d).toLocaleDateString('en',{month:'short',day:'numeric'});}
function escH(s){return s?s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''}
async function loadPosts(){var c=document.getElementById('postsContainer');if(!c)return;try{var res=await fetch(SB_URL+'/rest/v1/posts?listing_id=eq.'+LISTING_ID+'&order=created_at.desc&select=*,media(*)',{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}});allPosts=await res.json()||[];var ids=allPosts.map(function(p){return p.id});if(ids.length){try{var lr=await fetch(SB_URL+'/rest/v1/post_likes?visitor_id=eq.'+HT_VISITOR+'&post_id=in.('+ids.join(',')+')&select=post_id',{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}});var likes=await lr.json()||[];likes.forEach(function(l){likedSet.add(l.post_id)});}catch(e){}}renderPosts();}catch(e){c.innerHTML='<div style="text-align:center;padding:3rem;color:#888">Could not load posts</div>';}}
function renderPosts(){var c=document.getElementById('postsContainer'),ct=document.getElementById('postsCount');if(ct)ct.textContent=allPosts.length+' post'+(allPosts.length!==1?'s':'');if(!allPosts.length){c.innerHTML='<div style="text-align:center;padding:3rem;color:#888">No posts yet</div>';return;}postsView==='grid'?renderGrid(c):renderFeed(c);}
function renderGrid(c){var h='<div class="post-grid">';allPosts.forEach(function(p,i){var media=(p.media||[]).filter(function(m){return!m.is_profile&&!m.is_cover});if(media.length)h+='<div class="post-grid-item" onclick="openPostLb('+i+',0)"><img src="'+murl(media[0])+'" loading="lazy" alt=""></div>';else if(p.body)h+='<div class="post-grid-item pgt" onclick="expandTxt('+i+')"><p>'+escH(p.body)+'</p></div>';});h+='</div>';c.innerHTML=h;}
function renderFeed(c){var h='<div class="post-feed">';allPosts.forEach(function(p,pi){var media=(p.media||[]).filter(function(m){return!m.is_profile&&!m.is_cover});h+='<div class="pc"><div class="pc-hd"><div class="pc-av" style="border-radius:'+(IS_PROMOTED?'12px':'50%')+'">';if(PROFILE_PHOTO)h+='<img src="'+PROFILE_PHOTO+'">';else h+='<span style="color:#fff;font-size:.75rem;font-weight:700">'+INI+'</span>';h+='</div><div class="pc-meta"><div class="pc-name">'+LISTING_NAME+'</div><div class="pc-loc">'+LISTING_CITY+', '+LISTING_STATE+'</div></div><span class="pc-time">'+relTime(p.created_at)+'</span></div>';if(media.length)h+=renderPostMedia(media,pi);else if(p.body)h+='<div class="pc-txt">'+escH(p.body).replace(/\\n/g,'<br>')+'</div>';var lk=p.like_count||0,isLk=likedSet.has(p.id);h+='<div class="pc-acts"><button class="pc-act'+(isLk?' liked':'')+'" id="pclike-'+p.id+'" onclick="toggleLike(\\''+p.id+'\\')"><span class="pc-heart">'+(isLk?'\\u2764\\uFE0F':'\\u2661')+'</span> <span id="pclc-'+p.id+'">'+(lk>0?lk:'')+'</span></button><button class="pc-act" style="margin-left:auto" onclick="sharePost(this)">\\u2197 Share</button></div>';if(media.length&&p.body){var body=escH(p.body);h+='<div class="pc-cap"><b>'+LISTING_NAME+'</b> ';if(body.length>200)h+='<span data-full="'+body.replace(/"/g,'&quot;')+'">'+body.substring(0,200)+'...<span class="pc-more" onclick="this.parentElement.textContent=this.parentElement.dataset.full">more</span></span>';else h+=body;h+='</div>';}h+='</div>';});h+='</div>';c.innerHTML=h;}
function renderPostMedia(media,pi){var n=media.length,h='<div class="pc-media">';if(n===1){h+='<div class="pm-grid" style="grid-template-columns:1fr"><div style="aspect-ratio:4/5" onclick="openPostLb('+pi+',0)"><img src="'+murl(media[0])+'" loading="lazy"></div></div>';}else if(n===2){h+='<div class="pm-grid" style="grid-template-columns:1fr 1fr">';for(var i=0;i<2;i++)h+='<div style="aspect-ratio:4/5" onclick="openPostLb('+pi+','+i+')"><img src="'+murl(media[i])+'" loading="lazy"></div>';h+='</div>';}else if(n===3){h+='<div class="pm-grid" style="grid-template-columns:1.2fr 1fr;grid-template-rows:1fr 1fr">';h+='<div style="grid-row:1/3" onclick="openPostLb('+pi+',0)"><img src="'+murl(media[0])+'" loading="lazy" style="height:100%"></div>';h+='<div onclick="openPostLb('+pi+',1)"><img src="'+murl(media[1])+'" loading="lazy" style="height:100%"></div>';h+='<div onclick="openPostLb('+pi+',2)"><img src="'+murl(media[2])+'" loading="lazy" style="height:100%"></div>';h+='</div>';}else{h+='<div class="pm-grid" style="grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;aspect-ratio:1">';for(var i=0;i<Math.min(4,n);i++){h+='<div style="position:relative" onclick="openPostLb('+pi+','+i+')"><img src="'+murl(media[i])+'" loading="lazy" style="height:100%">';if(i===3&&n>4)h+='<div class="pm-over">+'+(n-3)+'</div>';h+='</div>';}h+='</div>';}h+='</div>';return h;}
function setPostsView(v){postsView=v;document.querySelectorAll('.toggle-btn').forEach(function(b){b.classList.toggle('active',b.dataset.view===v);});renderPosts();}
function openPostLb(pi,ii){var p=allPosts[pi];if(!p)return;var media=(p.media||[]).filter(function(m){return!m.is_profile&&!m.is_cover&&m.type!=='video'});if(!media.length)return;lbMedia=media.map(function(m){return{url:murl(m)}});lbIdx=ii||0;document.getElementById('lbImg').src=lbMedia[lbIdx].url;document.getElementById('lbCounter').textContent=(lbIdx+1)+' / '+lbMedia.length;document.getElementById('lightbox').classList.add('open');document.body.style.overflow='hidden';}
function expandTxt(i){var p=allPosts[i];if(p&&p.body)alert(p.body);}
var touchX=0;document.getElementById('lightbox').addEventListener('touchstart',function(e){touchX=e.touches[0].clientX},{passive:true});document.getElementById('lightbox').addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>50)lbNav(dx<0?1:-1);});
async function toggleLike(postId){var btn=document.getElementById('pclike-'+postId);if(!btn)return;var heart=btn.querySelector('.pc-heart'),countEl=document.getElementById('pclc-'+postId);var liked=likedSet.has(postId);var post=allPosts.find(function(p){return p.id===postId});if(liked){likedSet.delete(postId);btn.classList.remove('liked');heart.textContent='\\u2661';if(post){post.like_count=Math.max(0,(post.like_count||0)-1);countEl.textContent=post.like_count>0?post.like_count:'';}fetch(SB_URL+'/rest/v1/post_likes?post_id=eq.'+postId+'&visitor_id=eq.'+HT_VISITOR,{method:'DELETE',headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}});fetch(SB_URL+'/rest/v1/posts?id=eq.'+postId,{method:'PATCH',headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({like_count:post?post.like_count:0})});}else{likedSet.add(postId);btn.classList.add('liked');heart.textContent='\\u2764\\uFE0F';heart.classList.add('pc-heart-pop');setTimeout(function(){heart.classList.remove('pc-heart-pop')},300);if(post){post.like_count=(post.like_count||0)+1;countEl.textContent=post.like_count;}fetch(SB_URL+'/rest/v1/post_likes',{method:'POST',headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({post_id:postId,visitor_id:HT_VISITOR})});fetch(SB_URL+'/rest/v1/posts?id=eq.'+postId,{method:'PATCH',headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({like_count:post?post.like_count:0})});}}
function sharePost(btn){navigator.clipboard.writeText(location.href).then(function(){var orig=btn.innerHTML;btn.innerHTML='\\u2713 Copied';btn.style.color='#2D5A3D';setTimeout(function(){btn.innerHTML=orig;btn.style.color='';},2000);}).catch(function(){});}
`;
  }

  return js;
}

// ── Shop System Helpers ──

function getShopCSS() {
  return `.shop-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:.75rem}.shop-card{background:#fff;border:1px solid var(--bd);border-radius:16px;overflow:hidden;cursor:pointer;transition:all .2s}.shop-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.08);transform:translateY(-2px)}.shop-img{aspect-ratio:1;overflow:hidden;background:#F5F4F0}.shop-img img{width:100%;height:100%;object-fit:cover;transition:transform .3s}.shop-card:hover .shop-img img{transform:scale(1.05)}.shop-body{padding:14px}.shop-cat{font-size:.6875rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:4px}.shop-name{font-size:.9375rem;font-weight:600;margin-bottom:6px;line-height:1.3}.shop-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}.shop-price{font-size:1.0625rem;font-weight:700;color:var(--ac)}.shop-view{font-size:.75rem;font-weight:600;color:var(--ac);background:var(--al);padding:4px 12px;border-radius:20px}.shop-stock{display:flex;align-items:center;gap:6px;font-size:.75rem;color:#888}.stock-dot{width:6px;height:6px;border-radius:50%;display:inline-block}.sp-overlay{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;padding:1rem}.sp-overlay.open{display:flex}.sp-modal{background:#fff;border-radius:20px;max-width:580px;width:100%;max-height:90vh;overflow-y:auto;position:relative}.sp-close{position:absolute;top:1rem;right:1rem;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.05);border:none;font-size:1.25rem;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2;color:#555;transition:background .15s}.sp-close:hover{background:rgba(0,0,0,.1)}.sp-img{width:100%;aspect-ratio:1;overflow:hidden;border-radius:20px 20px 0 0}.sp-img img{width:100%;height:100%;object-fit:cover}.sp-img-ph{display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#F5F4F0;color:#ccc;font-size:4rem}.sp-body{padding:1.5rem}.sp-cat{font-size:.6875rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:6px}.sp-name{font-size:1.5rem;font-weight:700;margin-bottom:8px;font-family:var(--se)}.sp-price{font-size:1.375rem;font-weight:700;color:var(--ac);margin-bottom:12px}.sp-desc{font-size:.9375rem;color:#555;line-height:1.65;margin-bottom:1.25rem}.sp-stock{display:flex;align-items:center;gap:8px;font-size:.875rem;margin-bottom:1.5rem}.sp-actions{display:flex;gap:.75rem}.sp-buy{flex:1;padding:14px;background:var(--ac);color:#fff;border:none;border-radius:12px;font-size:1rem;font-weight:600;cursor:pointer;font-family:var(--f);transition:background .15s}.sp-buy:hover{background:var(--ac2)}.sp-buy:disabled{opacity:.5;cursor:not-allowed}.sp-msg{padding:14px 20px;background:#fff;color:var(--ac);border:2px solid var(--ac);border-radius:12px;font-size:1rem;font-weight:600;cursor:pointer;font-family:var(--f);transition:all .15s}.sp-msg:hover{background:var(--al)}.sp-form{padding:1.5rem}.sp-form h3{font-size:1.125rem;font-weight:700;margin-bottom:1rem}.sp-form .sf-row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.75rem}.sp-form .sf-full{margin-bottom:.75rem}.sp-form label{display:block;font-size:.75rem;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.04em;margin-bottom:.25rem}.sp-form input,.sp-form textarea{width:100%;padding:.625rem .75rem;border:1px solid var(--bd);border-radius:8px;font-size:.875rem;outline:none;font-family:var(--f);transition:border-color .15s}.sp-form input:focus,.sp-form textarea:focus{border-color:var(--ac)}.sp-form textarea{resize:vertical;min-height:60px}.sp-submit{width:100%;padding:14px;background:var(--ac);color:#fff;border:none;border-radius:12px;font-size:1rem;font-weight:600;cursor:pointer;font-family:var(--f);margin-top:.75rem;transition:background .15s}.sp-submit:hover{background:var(--ac2)}.sp-submit:disabled{opacity:.5;cursor:not-allowed}.sp-success{text-align:center;padding:3rem 1.5rem}.sp-success h3{font-size:1.25rem;color:var(--ac);margin-bottom:.5rem}.sp-success p{color:#555;font-size:.9375rem;margin-bottom:1.5rem}@media(max-width:768px){.shop-grid{grid-template-columns:repeat(2,1fr);gap:10px}.sp-modal{max-width:100%;border-radius:16px}.sp-form .sf-row{grid-template-columns:1fr}}@media(max-width:480px){.shop-grid{grid-template-columns:1fr 1fr;gap:8px}.shop-body{padding:10px}.shop-name{font-size:.8125rem}}`;
}

function getShopJS(l, products, allMedia) {
  const productsJSON = JSON.stringify(products.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: parseFloat(p.price),
    category: p.category,
    in_stock: p.in_stock,
    img: (() => {
      const m = allMedia.find(mm => mm.product_id === p.id);
      return m ? (SB_URL + '/storage/v1/object/public/' + (m.is_placeholder ? 'placeholders' : 'media') + '/' + m.storage_path) : '';
    })()
  })));

  return `
var SHOP_PRODUCTS=${productsJSON};
var SHOP_LISTING_ID=${l.id};
var SHOP_LISTING_NAME='${esc(l.name).replace(/'/g, "\\'")}';

function openProduct(idx){
  var p=SHOP_PRODUCTS[idx];if(!p)return;
  var modal=document.getElementById('shopModal');
  var cat=(p.category||'other').charAt(0).toUpperCase()+(p.category||'other').slice(1);
  var h='<button class="sp-close" onclick="closeProduct()">&times;</button>';
  h+='<div class="sp-img">';
  if(p.img) h+='<img src="'+p.img+'" alt="'+escH(p.name)+'">';
  else h+='<div class="sp-img-ph">\\u{1F4E6}</div>';
  h+='</div>';
  h+='<div class="sp-body">';
  h+='<div class="sp-cat">'+escH(cat)+'</div>';
  h+='<h2 class="sp-name">'+escH(p.name)+'</h2>';
  h+='<div class="sp-price">$'+p.price.toFixed(2)+'</div>';
  if(p.description) h+='<p class="sp-desc">'+escH(p.description).replace(/\\n/g,'<br>')+'</p>';
  h+='<div class="sp-stock"><span class="stock-dot" style="background:'+(p.in_stock?'#059669':'#DC2626')+'"></span>'+(p.in_stock?'In Stock':'Out of Stock')+'</div>';
  h+='<div class="sp-actions">';
  h+='<button class="sp-buy" onclick="showOrderForm('+idx+')"'+(p.in_stock?'':' disabled')+'>'+(p.in_stock?'\\u{1F6D2} Buy Now':'Out of Stock')+'</button>';
  h+='<button class="sp-msg" onclick="closeProduct();openMsgPanel()">\\u{1F4AC}</button>';
  h+='</div></div>';
  modal.innerHTML=h;
  document.getElementById('shopOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeProduct(){
  document.getElementById('shopOverlay').classList.remove('open');
  document.body.style.overflow='';
}
function showOrderForm(idx){
  var p=SHOP_PRODUCTS[idx];if(!p)return;
  var modal=document.getElementById('shopModal');
  var h='<button class="sp-close" onclick="closeProduct()">&times;</button>';
  h+='<div class="sp-form">';
  h+='<h3>\\u{1F6D2} Order '+escH(p.name)+'</h3>';
  h+='<div style="background:var(--al);border-radius:8px;padding:.75rem;margin-bottom:1rem;display:flex;align-items:center;gap:.75rem">';
  if(p.img) h+='<img src="'+p.img+'" style="width:48px;height:48px;border-radius:8px;object-fit:cover">';
  h+='<div><strong>'+escH(p.name)+'</strong><div style="color:var(--ac);font-weight:700">$'+p.price.toFixed(2)+'</div></div></div>';
  h+='<div class="sf-row"><div><label>Name *</label><input type="text" id="soName" placeholder="Your full name"></div>';
  h+='<div><label>Email *</label><input type="email" id="soEmail" placeholder="your@email.com"></div></div>';
  h+='<div class="sf-row"><div><label>Phone</label><input type="tel" id="soPhone" placeholder="(555) 123-4567"></div>';
  h+='<div><label>Street Address</label><input type="text" id="soStreet" placeholder="123 Main St"></div></div>';
  h+='<div class="sf-row"><div><label>City</label><input type="text" id="soCity" placeholder="City"></div>';
  h+='<div><label>State</label><input type="text" id="soState" placeholder="State"></div></div>';
  h+='<div class="sf-row"><div><label>ZIP Code</label><input type="text" id="soZip" placeholder="12345"></div><div></div></div>';
  h+='<button class="sp-submit" id="soSubmitBtn" onclick="submitOrder('+idx+')">Place Order</button>';
  h+='</div>';
  modal.innerHTML=h;
}
async function submitOrder(idx){
  var p=SHOP_PRODUCTS[idx];if(!p)return;
  var name=document.getElementById('soName').value.trim();
  var email=document.getElementById('soEmail').value.trim();
  if(!name||!email){alert('Please enter your name and email.');return;}
  var btn=document.getElementById('soSubmitBtn');
  btn.disabled=true;btn.textContent='Placing order...';
  try{
    var res=await fetch(SB_URL+'/rest/v1/product_orders',{method:'POST',headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({product_id:p.id,listing_id:SHOP_LISTING_ID,customer_name:name,customer_email:email,customer_phone:document.getElementById('soPhone').value.trim()||null,shipping_street:document.getElementById('soStreet').value.trim()||null,shipping_city:document.getElementById('soCity').value.trim()||null,shipping_state:document.getElementById('soState').value.trim()||null,shipping_zip:document.getElementById('soZip').value.trim()||null,status:'new'})});
    if(!res.ok)throw new Error('Order failed');
    var modal=document.getElementById('shopModal');
    modal.innerHTML='<button class="sp-close" onclick="closeProduct()">&times;</button><div class="sp-success"><div style="font-size:3rem;margin-bottom:.5rem">\\u2705</div><h3>Order Placed!</h3><p>'+escH(SHOP_LISTING_NAME)+' has received your order for <strong>'+escH(p.name)+'</strong>. They\\'ll be in touch shortly to confirm details and arrange payment.</p><button class="sp-buy" onclick="closeProduct()">Done</button></div>';
  }catch(e){console.error(e);alert('Something went wrong. Please try again.');btn.disabled=false;btn.textContent='Place Order';}
}
`;
}
