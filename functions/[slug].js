const SB_URL = 'https://ingorrzmoudvoknhwjjb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc';

const RESERVED = new Set([
  'near-me','signup','dashboard','admin','contact','privacy','terms',
  'for-professionals','review','marketplace','join','sitemap.xml','robots.txt','favicon.ico',
  '_headers','_redirects','api','functions'
]);

function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function citySlug(city, state) {
  return city.toLowerCase().replace(/\s+/g, '-') + '-' + state.toLowerCase();
}

function listingUrl(l) {
  return '/near-me/' + citySlug(l.city, l.state) + '/' + l.slug;
}

function fmtPhone(raw) {
  if (!raw) return '';
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return '(' + d.slice(0,3) + ') ' + d.slice(3,6) + '-' + d.slice(6);
  return raw;
}

export async function onRequestGet(context) {
  try {
    const { params, env, request } = context;
    const slug = params.slug;

    // Pass through reserved routes to static assets
    if (RESERVED.has(slug) || slug.includes('.')) {
      return env.ASSETS.fetch(request);
    }

    const hdrs = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY };

    // Fetch listing by slug
    const listingRes = await fetch(
      SB_URL + '/rest/v1/listings?slug=eq.' + encodeURIComponent(slug) + '&select=*&limit=1',
      { headers: hdrs }
    );
    const listings = await listingRes.json();
    if (!listings || !listings.length) {
      return new Response(render404(slug), { status: 404, headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
    }

    const l = listings[0];
    const isPromoted = l.promoted && l.promoted_until && new Date(l.promoted_until) > new Date();
    const profileUrl = listingUrl(l);

    // Not promoted → 301 redirect to full listing page
    if (!isPromoted) {
      return Response.redirect('https://hairtattoo.com' + profileUrl, 301);
    }

    // Promoted but link page disabled → redirect
    if (l.link_page_enabled === false) {
      return Response.redirect('https://hairtattoo.com' + profileUrl, 301);
    }

    // Fetch profile photo + link items in parallel
    const [photoRes, itemsRes] = await Promise.all([
      fetch(SB_URL + '/rest/v1/media?listing_id=eq.' + l.id + '&is_profile=eq.true&select=storage_path,is_placeholder&limit=1', { headers: hdrs }),
      fetch(SB_URL + '/rest/v1/link_page_items?listing_id=eq.' + l.id + '&is_active=eq.true&select=*&order=sort_order.asc', { headers: hdrs })
    ]);

    const photos = await photoRes.json() || [];
    let items = await itemsRes.json() || [];

    // Profile photo URL
    let photoUrl = '';
    if (photos.length) {
      const p = photos[0];
      const bucket = p.is_placeholder ? 'placeholders' : 'media';
      photoUrl = SB_URL + '/storage/v1/object/public/' + bucket + '/' + p.storage_path;
    }

    // If no custom items saved, generate defaults from listing data
    if (!items.length) {
      items = generateDefaultLinks(l, profileUrl);
    }

    const html = renderLinkPage(l, photoUrl, items);
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=300, s-maxage=1800'
      }
    });

  } catch (err) {
    return new Response('<html><body><h1>Error</h1><pre>' + (err.stack || err.message) + '</pre></body></html>', {
      status: 500, headers: { 'Content-Type': 'text/html' }
    });
  }
}

function generateDefaultLinks(l, profileUrl) {
  const links = [];
  let i = 0;

  links.push({ id: 'default-profile', label: 'View My Full Profile', url: profileUrl, icon: '👤', sort_order: i++, type: 'primary' });

  if (l.booking_url) {
    links.push({ id: 'default-booking', label: 'Book a Consultation', url: l.booking_url, icon: '📅', sort_order: i++, type: 'primary' });
  }

  links.push({ id: 'default-review', label: 'Leave a Review', url: '/review.html?listing=' + l.slug, icon: '⭐', sort_order: i++, type: 'outline' });

  if (l.phone) {
    links.push({ id: 'default-phone', label: 'Call Us', url: 'tel:' + l.phone.replace(/\D/g, ''), icon: '📞', sort_order: i++, type: 'outline' });
  }

  if (l.instagram) {
    const ig = l.instagram.startsWith('http') ? l.instagram : 'https://instagram.com/' + l.instagram;
    links.push({ id: 'default-ig', label: 'Instagram', url: ig, icon: '📸', sort_order: i++, type: 'social' });
  }
  if (l.tiktok) {
    const tt = l.tiktok.startsWith('http') ? l.tiktok : 'https://tiktok.com/@' + l.tiktok;
    links.push({ id: 'default-tt', label: 'TikTok', url: tt, icon: '🎵', sort_order: i++, type: 'social' });
  }
  if (l.facebook) {
    const fb = l.facebook.startsWith('http') ? l.facebook : 'https://facebook.com/' + l.facebook;
    links.push({ id: 'default-fb', label: 'Facebook', url: fb, icon: '👍', sort_order: i++, type: 'social' });
  }
  if (l.website) {
    links.push({ id: 'default-web', label: 'Website', url: l.website, icon: '🌐', sort_order: i++, type: 'social' });
  }

  return links;
}

function getLinkType(link, index) {
  // If link has explicit type (from default generation), use it
  if (link.type) return link.type;

  // For saved links, infer type from label/url
  const label = (link.label || '').toLowerCase();
  const url = (link.url || '').toLowerCase();

  if (label.includes('profile') || label.includes('book') || label.includes('consult')) return 'primary';
  if (label.includes('review') || label.includes('call') || url.startsWith('tel:')) return 'outline';
  if (label.includes('instagram') || label.includes('tiktok') || label.includes('facebook') || label.includes('website') ||
      url.includes('instagram.com') || url.includes('tiktok.com') || url.includes('facebook.com')) return 'social';

  // Custom links default to outline for first few, social for the rest
  return index < 4 ? 'outline' : 'social';
}

function renderLinkPage(l, photoUrl, items) {
  const accent = l.link_page_accent || '#2D5A3D';
  const bio = esc(l.link_page_bio || (l.about ? l.about.substring(0, 150) : ''));
  const initials = l.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const isPromoted = l.promoted && l.promoted_until && new Date(l.promoted_until) > new Date();
  const isClaimed = l.claimed;

  // City display
  const cityDisplay = l.city.charAt(0).toUpperCase() + l.city.slice(1).toLowerCase() + ', ' + l.state.toUpperCase();

  // Build link buttons HTML
  let linksHtml = '';
  items.forEach((item, idx) => {
    const type = getLinkType(item, idx);
    const btnClass = type === 'primary' ? 'lp-btn lp-primary' : type === 'outline' ? 'lp-btn lp-outline' : 'lp-btn lp-social';
    const delay = (idx * 0.05).toFixed(2);
    const itemId = item.id || '';
    const isExternal = item.url.startsWith('http') || item.url.startsWith('tel:');
    const target = isExternal ? ' target="_blank" rel="noopener"' : '';
    linksHtml += '<a href="' + esc(item.url) + '" class="' + btnClass + '" style="animation-delay:' + delay + 's" onclick="tc(\'' + esc(l.id.toString()) + '\',\'' + esc(itemId) + '\')"' + target + '>';
    linksHtml += '<span class="lp-icon">' + (item.icon || '🔗') + '</span>';
    linksHtml += '<span class="lp-label">' + esc(item.label) + '</span>';
    linksHtml += '<span class="lp-arrow">\u203A</span>';
    linksHtml += '</a>';
  });

  // Avatar HTML
  let avatarHtml;
  if (photoUrl) {
    avatarHtml = '<img src="' + esc(photoUrl) + '" alt="' + esc(l.name) + '" class="lp-avatar">';
  } else {
    avatarHtml = '<div class="lp-avatar lp-avatar-initials">' + esc(initials) + '</div>';
  }

  // Badges
  let badgesHtml = '';
  if (isClaimed) {
    badgesHtml += '<span class="lp-badge lp-badge-verified">\u2713 Verified</span>';
  }
  if (isPromoted) {
    badgesHtml += '<span class="lp-badge lp-badge-featured">\u2B50 Featured</span>';
  }

  return '<!DOCTYPE html><html lang="en"><head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(l.name) + ' \u2014 Hair Tattoo</title>' +
    '<meta name="description" content="' + bio.substring(0, 160) + '">' +
    '<meta property="og:title" content="' + esc(l.name) + ' \u2014 Hair Tattoo">' +
    '<meta property="og:description" content="' + bio.substring(0, 160) + '">' +
    (photoUrl ? '<meta property="og:image" content="' + esc(photoUrl) + '">' : '') +
    '<meta property="og:url" content="https://hairtattoo.com/' + esc(l.slug) + '">' +
    '<meta property="og:type" content="profile">' +
    '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>\uD83D\uDC88</text></svg>">' +
    '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">' +
    '<style>' + getLinkPageCSS(accent) + '</style>' +
    '</head><body>' +
    '<div class="lp-container">' +
      avatarHtml +
      '<h1 class="lp-name">' + esc(l.name) + '</h1>' +
      (badgesHtml ? '<div class="lp-badges">' + badgesHtml + '</div>' : '') +
      '<p class="lp-location">\uD83D\uDCCD ' + esc(cityDisplay) + '</p>' +
      (bio ? '<p class="lp-bio">' + bio + '</p>' : '') +
      '<div class="lp-links">' + linksHtml + '</div>' +
    '</div>' +
    '<script>' + getLinkPageJS(l.id) + '</script>' +
    '</body></html>';
}

function getLinkPageCSS(accent) {
  return '*{margin:0;padding:0;box-sizing:border-box}' +
    ':root{--ac:' + accent + ';--bg:#FAFAF8;--text:#1A1A1A;--t2:#555;--t3:#888;--bd:#E8E6E3;--f:\'DM Sans\',system-ui,sans-serif;--se:\'Instrument Serif\',Georgia,serif}' +
    'body{font-family:var(--f);background:var(--bg);color:var(--text);min-height:100vh;-webkit-font-smoothing:antialiased}' +
    '.lp-container{max-width:480px;margin:0 auto;padding:2.5rem 1.5rem;display:flex;flex-direction:column;align-items:center;text-align:center}' +
    '.lp-avatar{width:96px;height:96px;border-radius:16px;object-fit:cover;box-shadow:0 4px 16px rgba(0,0,0,.1);margin-bottom:1.25rem}' +
    '.lp-avatar-initials{background:var(--ac);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.75rem;font-weight:700;letter-spacing:.02em}' +
    '.lp-name{font-family:var(--se);font-size:1.75rem;font-weight:400;margin-bottom:.5rem;letter-spacing:-.01em}' +
    '.lp-badges{display:flex;gap:.5rem;margin-bottom:.5rem;flex-wrap:wrap;justify-content:center}' +
    '.lp-badge{font-size:.6875rem;font-weight:600;padding:.1875rem .625rem;border-radius:20px}' +
    '.lp-badge-verified{background:#E8F0EB;color:#2D5A3D}' +
    '.lp-badge-featured{background:#FEF3C7;color:#92400E}' +
    '.lp-location{font-size:.875rem;color:var(--t3);margin-bottom:.75rem}' +
    '.lp-bio{font-size:.875rem;color:var(--t2);line-height:1.6;max-width:380px;margin-bottom:1.75rem}' +
    '.lp-links{display:flex;flex-direction:column;gap:12px;width:100%;margin-top:1.75rem}' +
    '.lp-btn{display:flex;align-items:center;width:100%;padding:15px 20px;border-radius:12px;font-size:.9375rem;font-weight:600;text-decoration:none;transition:all .15s ease;cursor:pointer;animation:fadeSlideUp .4s ease both}' +
    '.lp-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.08)}' +
    '.lp-btn:active{transform:translateY(0)}' +
    '.lp-primary{background:var(--ac);color:#fff}' +
    '.lp-primary:hover{box-shadow:0 4px 16px rgba(0,0,0,.15)}' +
    '.lp-outline{background:transparent;color:var(--ac);border:2px solid var(--ac)}' +
    '.lp-outline:hover{background:var(--ac);color:#fff}' +
    '.lp-social{background:#fff;color:var(--text);border:1px solid var(--bd)}' +
    '.lp-social:hover{border-color:var(--ac);color:var(--ac)}' +
    '.lp-icon{font-size:1.125rem;width:28px;flex-shrink:0;text-align:center}' +
    '.lp-label{flex:1;text-align:center}' +
    '.lp-arrow{color:rgba(0,0,0,.2);font-size:1.25rem;flex-shrink:0;width:20px;text-align:right}' +
    '.lp-primary .lp-arrow{color:rgba(255,255,255,.4)}' +
    '.lp-outline .lp-arrow{color:rgba(0,0,0,.15)}' +
    '@keyframes fadeSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}' +
    '@media(max-width:520px){.lp-container{padding:2rem 1rem}.lp-name{font-size:1.5rem}}';
}

function getLinkPageJS(listingId) {
  return 'function tc(lid,iid){' +
    'try{' +
      'fetch("' + SB_URL + '/rest/v1/link_clicks",{method:"POST",keepalive:true,headers:{"apikey":"' + SB_KEY + '","Authorization":"Bearer ' + SB_KEY + '","Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify({listing_id:parseInt(lid),link_item_id:iid&&iid.length>10?iid:null,referrer:document.referrer||null})});' +
    '}catch(e){}' +
  '}';
}

function render404(slug) {
  return '<!DOCTYPE html><html lang="en"><head>' +
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Not Found \u2014 Hair Tattoo</title>' +
    '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>\uD83D\uDC88</text></svg>">' +
    '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">' +
    '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:\'DM Sans\',system-ui,sans-serif;background:#FAFAF8;color:#1A1A1A;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:2rem}' +
    '.wrap{max-width:400px}h1{font-family:\'Instrument Serif\',Georgia,serif;font-size:3rem;margin-bottom:.5rem}p{color:#555;margin-bottom:1.5rem}a{display:inline-block;padding:.75rem 1.5rem;background:#2D5A3D;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;transition:background .15s}a:hover{background:#3A7350}</style>' +
    '</head><body><div class="wrap"><h1>404</h1><p>We couldn\u2019t find a listing for \u201C' + esc(slug) + '\u201D</p><a href="/">Browse Artists</a></div></body></html>';
}
