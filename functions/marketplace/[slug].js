/*
 * MARKETPLACE HIDDEN — product detail pages redirect to homepage.
 * To re-enable, restore the original handler below this redirect block.
 */
export async function onRequestGet(context) {
  return Response.redirect('https://hairtattoo.com/', 301);
}

/* ── Original marketplace product page handler (preserved for re-enabling) ──
import { getHead, getNav, getFooter, esc, citySlug } from '../../templates/shared.js';

const SB_URL = 'https://ingorrzmoudvoknhwjjb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc';

function affUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes('amazon.com') && !u.searchParams.has('tag')) u.searchParams.set('tag', 'hairtattoo-20');
    return u.toString();
  } catch (e) { return url; }
}

async function onRequestGet_ORIGINAL(context) {
  try {
    const { params } = context;
    const slug = params.slug;

    // Fetch product by slug
    const prodRes = await fetch(
      `${SB_URL}/rest/v1/products?slug=eq.${encodeURIComponent(slug)}&select=*,listings(id,name,slug,city,state,about,instagram)&limit=1`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    );
    const products = await prodRes.json();
    if (!products || !products.length) {
      return new Response('Product not found', { status: 404, headers: { 'Content-Type': 'text/html' } });
    }

    const p = products[0];
    const listing = p.listings || null;
    const isCurated = p.source === 'curated';
    const cat = (p.category || 'other').charAt(0).toUpperCase() + (p.category || 'other').slice(1);

    // Get product image
    let imgSrc = '';
    if (p.image_url) {
      imgSrc = p.image_url;
    } else {
      const mediaRes = await fetch(
        `${SB_URL}/rest/v1/media?product_id=eq.${p.id}&select=*&limit=1`,
        { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
      );
      const media = await mediaRes.json();
      if (media && media.length) {
        const m = media[0];
        imgSrc = SB_URL + '/storage/v1/object/public/' + (m.is_placeholder ? 'placeholders' : 'media') + '/' + m.storage_path;
      }
    }

    const title = `${esc(p.name)} — SMP Marketplace | Hair Tattoo`;
    const desc = p.description ? esc(p.description).substring(0, 160) : `Shop ${esc(p.name)} from ${isCurated ? 'Hair Tattoo Picks' : (listing ? esc(listing.name) : 'SMP professionals')}.`;

    // Build seller section
    let sellerHTML = '';
    if (!isCurated && listing) {
      const cs = citySlug(listing.city, listing.state);
      const ini = listing.name.split(' ').map(w => w[0]).slice(0, 2).join('');
      sellerHTML = `
        <div class="pp-seller">
          <div class="pp-seller-av">${esc(ini)}</div>
          <div class="pp-seller-info">
            <div class="pp-seller-name">${esc(listing.name)}</div>
            <div class="pp-seller-loc">📍 ${esc(listing.city)}, ${esc(listing.state)}</div>
          </div>
          <a href="/near-me/${cs}/${listing.slug}" class="pp-seller-link">View Profile →</a>
        </div>`;
    } else if (isCurated) {
      sellerHTML = `
        <div class="pp-seller" style="background:linear-gradient(135deg,#F0F5F0,#E8F0EB)">
          <div class="pp-seller-av" style="background:var(--ac)">HT</div>
          <div class="pp-seller-info">
            <div class="pp-seller-name">Hair Tattoo Picks</div>
            <div class="pp-seller-loc">Recommended by our team</div>
          </div>
        </div>`;
    }

    // Build action button
    let actionHTML = '';
    if (isCurated && p.affiliate_url) {
      actionHTML = `<a class="pp-btn pp-btn-amazon" href="${esc(affUrl(p.affiliate_url))}" target="_blank" rel="noopener">🛒 Buy on Amazon →</a>`;
    } else if (p.sell_mode === 'external' && p.external_url) {
      actionHTML = `<a class="pp-btn pp-btn-primary" href="${esc(p.external_url)}" target="_blank" rel="noopener">Shop Now →</a>
        <p class="pp-redirect-note">You'll be redirected to the seller's store</p>`;
    } else {
      actionHTML = `<a class="pp-btn pp-btn-primary" href="/marketplace.html" onclick="event.preventDefault();alert('Order form coming soon! Visit the marketplace to order.')">🛒 Buy Now — $${parseFloat(p.price).toFixed(2)}</a>`;
    }

    // JSON-LD structured data
    const jsonLD = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": p.name,
      "description": p.description || '',
      "image": imgSrc || undefined,
      "offers": {
        "@type": "Offer",
        "price": parseFloat(p.price).toFixed(2),
        "priceCurrency": "USD",
        "availability": p.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        ...(listing ? { "seller": { "@type": "Organization", "name": listing.name } } : {})
      }
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
${getHead(title, desc)}
<meta property="og:title" content="${esc(p.name)} — Hair Tattoo Marketplace">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="https://hairtattoo.com/marketplace/${esc(slug)}">
${imgSrc ? `<meta property="og:image" content="${esc(imgSrc)}">` : ''}
<link rel="canonical" href="https://hairtattoo.com/marketplace/${esc(slug)}">
<script type="application/ld+json">${jsonLD}</script>
<style>
.pp-wrap{max-width:720px;margin:0 auto;padding:2rem 1.5rem 3rem}
.pp-breadcrumbs{font-size:.75rem;color:var(--t3);margin-bottom:1.5rem;display:flex;gap:.375rem;align-items:center}
.pp-breadcrumbs a{color:var(--t3);transition:color .15s}.pp-breadcrumbs a:hover{color:var(--ac)}
.pp-card{background:var(--card);border:1px solid var(--bd);border-radius:16px;overflow:hidden}
.pp-img{width:100%;aspect-ratio:1;overflow:hidden;background:#F5F4F0}
.pp-img img{width:100%;height:100%;object-fit:cover}
.pp-img-ph{display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#ccc;font-size:4rem}
.pp-body{padding:1.5rem}
.pp-cat{font-size:.6875rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);margin-bottom:6px}
.pp-name{font-size:1.75rem;font-weight:700;font-family:var(--se);margin-bottom:8px;line-height:1.2}
.pp-price{font-size:1.5rem;font-weight:700;color:var(--ac);margin-bottom:16px}
.pp-desc{font-size:1rem;color:#555;line-height:1.7;margin-bottom:1.5rem;white-space:pre-wrap}
.pp-stock{display:flex;align-items:center;gap:8px;font-size:.875rem;margin-bottom:1.5rem}
.pp-stock .dot{width:6px;height:6px;border-radius:50%;display:inline-block}
.pp-seller{display:flex;align-items:center;gap:.75rem;padding:1rem;background:#F5F4F0;border-radius:12px;margin-bottom:1.5rem}
.pp-seller-av{width:44px;height:44px;border-radius:50%;background:var(--ac);display:flex;align-items:center;justify-content:center;color:#fff;font-size:.875rem;font-weight:700;flex-shrink:0}
.pp-seller-info{flex:1}
.pp-seller-name{font-weight:600;font-size:.9375rem}
.pp-seller-loc{font-size:.75rem;color:var(--t3)}
.pp-seller-link{font-size:.8125rem;font-weight:600;white-space:nowrap}
.pp-btn{display:block;width:100%;padding:16px;border-radius:12px;font-size:1.0625rem;font-weight:600;text-align:center;cursor:pointer;transition:all .15s;text-decoration:none;font-family:var(--f)}
.pp-btn-primary{background:var(--ac);color:#fff}.pp-btn-primary:hover{background:var(--ac2)}
.pp-btn-amazon{background:#FF9900;color:#111}.pp-btn-amazon:hover{background:#E88B00}
.pp-redirect-note{font-size:.6875rem;color:var(--t3);text-align:center;margin-top:6px}
.pp-back{display:inline-flex;align-items:center;gap:6px;font-size:.875rem;font-weight:500;color:var(--ac);margin-top:1.5rem;transition:color .15s}.pp-back:hover{color:var(--ac2)}
@media(max-width:640px){.pp-wrap{padding:1rem 1rem 2rem}.pp-name{font-size:1.375rem}.pp-price{font-size:1.25rem}}
</style>
</head>
<body>
${getNav()}

<div class="pp-wrap">
  <div class="pp-breadcrumbs">
    <a href="/">Home</a> <span>›</span>
    <a href="/marketplace.html">Marketplace</a> <span>›</span>
    <span style="color:var(--text)">${esc(p.name)}</span>
  </div>

  <div class="pp-card">
    <div class="pp-img">
      ${imgSrc ? `<img src="${esc(imgSrc)}" alt="${esc(p.name)}" loading="eager">` : '<div class="pp-img-ph">📦</div>'}
    </div>
    <div class="pp-body">
      <div class="pp-cat">${esc(cat)}</div>
      <h1 class="pp-name">${esc(p.name)}</h1>
      <div class="pp-price">$${parseFloat(p.price).toFixed(2)}</div>
      ${p.description ? `<p class="pp-desc">${esc(p.description)}</p>` : ''}
      <div class="pp-stock">
        <span class="dot" style="background:${p.in_stock ? '#059669' : '#DC2626'}"></span>
        ${p.in_stock ? 'In Stock' : 'Out of Stock'}
      </div>
      ${sellerHTML}
      ${actionHTML}
    </div>
  </div>

  <a href="/marketplace.html" class="pp-back">← Back to Marketplace</a>
</div>

${getFooter()}
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'public, max-age=300' }
    });
  } catch (err) {
    return new Response('Error: ' + err.message, { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}
── End of original marketplace handler ── */
