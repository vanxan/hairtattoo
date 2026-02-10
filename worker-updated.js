// hairtattoo-router Cloudflare Worker
// Renders listing detail pages at /near-me/{city-state}/{slug}
// Design matches index.html exactly

var SUPABASE_URL = 'https://ingorrzmoudvoknhwjjb.supabase.co';
var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc';
var MEDIA_BASE = SUPABASE_URL + '/storage/v1/object/public/placeholders/';

addEventListener('fetch', function(event) {
  event.respondWith(handleRequest(event));
});

async function handleRequest(event) {
  var request = event.request;
  var url = new URL(request.url);
  var path = url.pathname;

  var match = path.match(/^\/near-me\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/);
  if (!match) return fetch(request);

  var slug = match[2];

  try {
    var headers = { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON };

    var listRes = await fetch(
      SUPABASE_URL + '/rest/v1/listings?slug=eq.' + encodeURIComponent(slug) + '&select=*',
      { headers: headers }
    );
    var listings = await listRes.json();
    if (!listings || !listings.length) return fetch(request);
    var l = listings[0];

    var mediaRes = await fetch(
      SUPABASE_URL + '/rest/v1/media?listing_id=eq.' + l.id + '&select=*&order=sort_order.asc',
      { headers: headers }
    );
    var media = await mediaRes.json();

    var viewRes = await fetch(
      SUPABASE_URL + '/rest/v1/listing_stats?id=eq.' + l.id + '&select=view_count',
      { headers: headers }
    );
    var viewData = await viewRes.json();
    var viewCount = (viewData && viewData[0] && viewData[0].view_count) || 0;

    event.waitUntil(
      fetch(SUPABASE_URL + '/rest/v1/page_views', {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: 'Bearer ' + SUPABASE_ANON,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ listing_id: l.id, path: path })
      })
    );

    var html = renderDetail(l, media, viewCount);
    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'public, max-age=300, s-maxage=3600' }
    });
  } catch (e) {
    return fetch(request);
  }
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function mediaUrl(storagePath) {
  return MEDIA_BASE + encodeURIComponent(storagePath);
}

function listingUrl(l) {
  return '/near-me/' + l.city.toLowerCase().replace(/\s+/g, '-') + '-' + l.state.toLowerCase() + '/' + l.slug;
}

function renderDetail(l, media, viewCount) {
  var ini = l.name.split(' ').map(function(w) { return w[0]; }).slice(0, 2).join('');
  var pr = l.price_range || '$$';
  var services = l.services || [];
  var instagram = l.instagram || '';
  var facebook = l.facebook || '';
  var tiktok = l.tiktok || '';
  var claimed = l.claimed || false;
  var citySlug = l.city.toLowerCase().replace(/\s+/g, '-') + '-' + l.state.toLowerCase();

  // Social links
  var socHTML = '';
  if (instagram) socHTML += '<a href="https://instagram.com/' + esc(instagram) + '" target="_blank" rel="noopener" class="dp-social"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5"/></svg> @' + esc(instagram) + '</a>';
  if (facebook) socHTML += '<a href="https://facebook.com/' + esc(facebook) + '" target="_blank" rel="noopener" class="dp-social"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg> Facebook</a>';
  if (tiktok) socHTML += '<a href="https://tiktok.com/@' + esc(tiktok) + '" target="_blank" rel="noopener" class="dp-social">TikTok</a>';
  if (l.website) socHTML += '<a href="' + esc(l.website) + '" target="_blank" rel="noopener" class="dp-social"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Website</a>';

  // Gallery
  var galleryHTML = '';
  if (media && media.length) {
    for (var i = 0; i < media.length; i++) {
      var m = media[i];
      galleryHTML += '<div class="gal-item" onclick="openLb(' + i + ')"><img src="' + mediaUrl(m.storage_path) + '" loading="lazy" width="240" height="200" alt="' + esc(l.name) + '">' + (m.is_placeholder ? '<span class="c-pill">\ud83d\udcf7 Sample photo</span>' : '') + '</div>';
    }
  } else {
    var colors = ['#c8dbd0','#b8d0c2','#a8c5b4','#d4e4d9','#e0ebe5','#bcd4c6'];
    var labels = ['Before & After','Hairline Closeup','Density Session','Side Profile','Top View','Final Result'];
    for (var i = 0; i < 6; i++) {
      galleryHTML += '<div style="background:' + colors[i] + ';border-radius:8px;height:200px;display:flex;align-items:center;justify-content:center;flex-direction:column;color:var(--ac)"><span style="font-family:var(--se);font-size:1.5rem;opacity:.5">' + ini + '</span><span style="font-size:.6rem;opacity:.35;margin-top:.25rem">' + labels[i] + '</span></div>';
    }
  }

  // Services
  var svcsHTML = '';
  for (var i = 0; i < services.length; i++) {
    svcsHTML += '<span>' + esc(services[i]) + '</span>';
  }

  // Message panel service chips
  var msgSvcsHTML = '';
  for (var i = 0; i < services.length; i++) {
    msgSvcsHTML += '<span class="msg-svc" onclick="this.classList.toggle(\'on\')">' + esc(services[i]) + '</span>';
  }

  // Footer cities
  var topCities = ['New York, NY','Los Angeles, CA','Houston, TX','Chicago, IL','Miami Beach, FL','Atlanta, GA','Phoenix, AZ','Dallas, TX','San Francisco, CA','Seattle, WA','Boston, MA','Denver, CO','Austin, TX','Nashville, TN','Tampa, FL','Fort Lauderdale, FL','San Diego, CA','Philadelphia, PA','Charlotte, NC','Las Vegas, NV','Portland, OR','Scottsdale, AZ','Boca Raton, FL','Fort Worth, TX','Beverly Hills, CA'];
  var footerCitiesHTML = '';
  for (var i = 0; i < topCities.length; i++) {
    var parts = topCities[i].split(', ');
    var cs = parts[0].toLowerCase().replace(/\s+/g, '-') + '-' + parts[1].toLowerCase();
    footerCitiesHTML += '<a href="/near-me/' + cs + '/" class="fc-link">' + topCities[i] + '</a>';
  }

  // Structured data
  var schema = JSON.stringify({
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
    'makesOffer': services.map(function(s) {
      return { '@type': 'Offer', 'itemOffered': { '@type': 'Service', 'name': s } };
    })
  });

  // Media JSON for lightbox
  var mediaItems = [];
  if (media && media.length) {
    for (var i = 0; i < media.length; i++) {
      mediaItems.push({ url: mediaUrl(media[i].storage_path), isPlaceholder: media[i].is_placeholder || false });
    }
  }
  var mediaJSON = JSON.stringify(mediaItems);

  // OG image
  var ogImage = '';
  if (media && media.length && !media[0].is_placeholder) {
    ogImage = '<meta property="og:image" content="' + mediaUrl(media[0].storage_path) + '">';
  }

  // Claim banner
  var claimHTML = '';
  if (!claimed) {
    claimHTML = '<div class="dp-claim"><span style="flex:1">Is this your business? Claim it to manage your listing.</span><button onclick="location.href=\'/signup.html?claim=' + esc(l.slug) + '\'">Claim Page</button></div>';
  }

  // Description for meta
  var metaDesc = l.about ? esc(l.about.slice(0, 160)) : esc(l.name) + ' — scalp micropigmentation artist in ' + esc(l.city) + ', ' + esc(l.state);

  // Escaped name for JS
  var jsName = l.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  var jsCity = l.city.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  var jsState = l.state.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  var h = '';
  h += '<!DOCTYPE html>';
  h += '<html lang="en">';
  h += '<head>';
  h += '<meta charset="UTF-8">';
  h += '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5">';
  h += '<title>' + esc(l.name) + ' \u2014 Hair Tattoo & SMP | HairTattoo.com</title>';
  h += '<meta name="description" content="' + metaDesc + '">';
  h += '<link rel="canonical" href="https://hairtattoo.com' + listingUrl(l) + '">';
  h += '<meta property="og:title" content="' + esc(l.name) + ' \u2014 Hair Tattoo & SMP | HairTattoo.com">';
  h += '<meta property="og:description" content="' + metaDesc + '">';
  h += '<meta property="og:type" content="website">';
  h += '<meta property="og:url" content="https://hairtattoo.com' + listingUrl(l) + '">';
  h += '<meta property="og:site_name" content="HairTattoo">';
  h += ogImage;
  h += '<meta name="twitter:card" content="summary_large_image">';
  h += '<meta name="robots" content="index, follow">';
  h += '<meta name="theme-color" content="#2D5A3D">';
  h += '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>\ud83d\udc88</text></svg>">';
  h += '<link rel="preconnect" href="https://fonts.googleapis.com">';
  h += '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
  h += '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">';
  h += '<style>';
  h += '*{margin:0;padding:0;box-sizing:border-box}';
  h += ':root{--bg:#FAFAF8;--card:#FFF;--text:#1A1A1A;--t2:#555;--t3:#888;--ac:#2D5A3D;--ac2:#3A7350;--al:#E8F0EB;--bd:#E8E6E3;--sh:0 1px 3px rgba(0,0,0,.06);--r:12px;--rs:8px;--f:\'DM Sans\',system-ui,sans-serif;--se:\'Instrument Serif\',Georgia,serif}';
  h += 'html{font-size:16px;scroll-behavior:smooth}';
  h += 'body{font-family:var(--f);background:var(--bg);color:var(--text);line-height:1.5;-webkit-font-smoothing:antialiased;display:flex;flex-direction:column;min-height:100vh}';
  h += 'a{color:var(--ac);text-decoration:none}';
  h += 'button{font-family:var(--f);cursor:pointer;border:none;background:none}';
  h += 'input,textarea,select{font-family:var(--f);font-size:1rem}';

  // NAV
  h += '.nav{position:sticky;top:0;z-index:100;background:rgba(250,250,248,.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--bd);padding:0 1rem}';
  h += '.nav-in{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:56px}';
  h += '.logo{font-family:var(--se);font-size:1.5rem;color:var(--text);letter-spacing:-.02em}';
  h += '.logo span{color:var(--ac)}';
  h += '.nav-r{display:flex;gap:.75rem;align-items:center}';
  h += '.nav-r a{color:var(--t2);font-size:.875rem;font-weight:500;transition:color .15s}';
  h += '.nav-r a:hover{color:var(--ac)}';
  h += '.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.5rem 1rem;border-radius:var(--rs);font-size:.875rem;font-weight:500;transition:all .15s}';
  h += '.btn-p{background:var(--ac);color:#fff}.btn-p:hover{background:var(--ac2)}';
  h += '.btn-o{border:1px solid var(--bd);color:var(--text)}.btn-o:hover{border-color:var(--ac);color:var(--ac)}';

  // DETAIL
  h += '.detail-page{max-width:720px;margin:0 auto;padding:1rem 1rem 3rem;flex:1;width:100%}';
  h += '.dp-back{font-size:.875rem;color:var(--t2);display:inline-flex;align-items:center;gap:.375rem;margin-bottom:1.25rem;padding:.375rem 0;transition:color .15s}';
  h += '.dp-back:hover{color:var(--ac)}';
  h += '.dp-header{display:flex;gap:1.25rem;align-items:flex-start;margin-bottom:1.5rem}';
  h += '.dp-av{width:80px;height:80px;border-radius:50%;background:var(--al);display:flex;align-items:center;justify-content:center;font-family:var(--se);font-size:2rem;color:var(--ac);flex-shrink:0}';
  h += '.dp-info{flex:1;min-width:0}';
  h += '.dp-name{font-size:1.5rem;font-weight:700;line-height:1.2;margin-bottom:.25rem}';
  h += '.dp-loc{color:var(--t2);font-size:.9375rem;margin-bottom:.25rem}';
  h += '.dp-price{color:var(--ac);font-weight:600;font-size:.875rem}';
  h += '.dp-socials{display:flex;gap:.5rem;margin-top:.5rem;flex-wrap:wrap}';
  h += '.dp-social{display:inline-flex;align-items:center;gap:.25rem;padding:.25rem .625rem;background:var(--al);border-radius:20px;font-size:.75rem;font-weight:500;color:var(--ac);transition:all .15s}';
  h += '.dp-social:hover{background:var(--ac);color:#fff}';
  h += '.dp-claim{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;padding:.75rem 1rem;border-radius:var(--rs);display:flex;align-items:center;gap:.75rem;font-size:.8125rem;margin-bottom:1.25rem}';
  h += '.dp-claim button{background:rgba(255,255,255,.2);color:#fff;padding:.25rem .75rem;border-radius:4px;font-size:.8125rem;font-weight:500;white-space:nowrap}';
  h += '.dp-claim button:hover{background:rgba(255,255,255,.35)}';
  h += '.dp-section{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:1.25rem;margin-bottom:1rem}';
  h += '.dp-section h3{font-size:.6875rem;text-transform:uppercase;letter-spacing:.08em;color:var(--t3);margin-bottom:.625rem;font-weight:600}';
  h += '.dp-about{font-size:.9375rem;color:var(--t2);line-height:1.7}';
  h += '.dp-svcs{display:flex;flex-wrap:wrap;gap:.375rem}';
  h += '.dp-svcs span{font-size:.8125rem;padding:.25rem .75rem;background:var(--al);color:var(--ac);border-radius:6px}';
  h += '.dp-grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}';
  h += '.dp-det label{display:block;font-size:.6875rem;color:var(--t3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px}';
  h += '.dp-det a{color:var(--ac);word-break:break-all;font-size:.875rem}';
  h += '.dp-det span{font-size:.875rem;color:var(--text)}';

  // GALLERY
  h += '.gal-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}';
  h += '.gal-item{border-radius:8px;overflow:hidden;position:relative;cursor:pointer;transition:transform .15s}';
  h += '.gal-item:hover{transform:scale(1.03)}';
  h += '.gal-item img{width:100%;height:200px;object-fit:cover;display:block}';
  h += '.c-pill{position:absolute;bottom:8px;left:8px;background:rgba(255,255,255,.85);backdrop-filter:blur(4px);padding:2px 8px;border-radius:12px;font-size:.625rem;color:var(--t2);pointer-events:none}';

  // CONTACT FORM
  h += '.cf{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:1.25rem;margin-bottom:1rem}';
  h += '.cf h3{font-size:.9375rem;font-weight:700;color:var(--ac);margin-bottom:.75rem}';
  h += '.cf-row{display:flex;gap:.5rem;margin-bottom:.5rem}';
  h += '.cf-row input,.cf-row textarea{flex:1;padding:.625rem .75rem;border:1px solid var(--bd);border-radius:var(--rs);outline:none;font-size:.875rem;background:#fff;transition:border-color .15s;font-family:var(--f)}';
  h += '.cf-row input:focus,.cf-row textarea:focus{border-color:var(--ac)}';
  h += '.cf-row textarea{resize:vertical;min-height:72px}';
  h += '.cf-sub{width:100%;padding:.625rem;background:var(--ac);color:#fff;border-radius:var(--rs);font-weight:600;font-size:.875rem;transition:background .15s}';
  h += '.cf-sub:hover{background:var(--ac2)}';
  h += '.cf-ok{text-align:center;padding:.75rem;color:var(--ac);font-weight:500;font-size:.875rem}';

  // MESSAGE PANEL
  h += '.msg-overlay{display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.4)}';
  h += '.msg-overlay.open{display:block}';
  h += '.msg-panel{position:fixed;top:0;right:-420px;width:400px;max-width:90vw;height:100vh;background:var(--card);z-index:201;box-shadow:-4px 0 20px rgba(0,0,0,.1);transition:right .3s ease;display:flex;flex-direction:column;overflow:hidden}';
  h += '.msg-panel.open{right:0}';
  h += '.msg-panel-head{padding:1.25rem;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between}';
  h += '.msg-panel-head h3{font-size:1rem;font-weight:700}';
  h += '.msg-panel-body{flex:1;overflow-y:auto;padding:1.25rem}';
  h += '.msg-panel-body label.mp-label{display:block;font-size:.8125rem;font-weight:500;margin-bottom:.25rem;color:var(--text)}';
  h += '.msg-panel-body input[type="text"],.msg-panel-body input[type="tel"],.msg-panel-body textarea{width:100%;padding:.625rem .75rem;border:1px solid var(--bd);border-radius:var(--rs);outline:none;font-size:.875rem;margin-bottom:.75rem;transition:border-color .15s;font-family:var(--f);background:#fff}';
  h += '.msg-panel-body input:focus,.msg-panel-body textarea:focus{border-color:var(--ac)}';
  h += '.msg-panel-body textarea{resize:vertical;min-height:80px}';
  h += '.msg-svcs{display:flex;flex-wrap:wrap;gap:.375rem;margin-bottom:.75rem}';
  h += '.msg-svc{font-size:.75rem;padding:.25rem .625rem;border:1px solid var(--bd);border-radius:20px;cursor:pointer;transition:all .15s;background:var(--card);color:var(--t2)}';
  h += '.msg-svc.on{border-color:var(--ac);background:var(--al);color:var(--ac)}';
  h += '.msg-consent{display:flex;align-items:flex-start;gap:.5rem;margin-bottom:1rem;font-size:.75rem;color:var(--t2)}';
  h += '.msg-consent input[type="checkbox"]{margin-top:2px;flex-shrink:0}';
  h += '.msg-submit{width:100%;padding:.75rem;background:var(--ac);color:#fff;border-radius:var(--rs);font-weight:600;font-size:.875rem;transition:background .15s}';
  h += '.msg-submit:hover{background:var(--ac2)}';
  h += '.msg-ok{text-align:center;padding:2rem 1rem}';
  h += '.msg-ok h4{font-size:1.125rem;margin-bottom:.5rem;color:var(--ac)}';
  h += '.msg-ok p{color:var(--t2);font-size:.875rem;margin-bottom:1rem}';

  // LIGHTBOX
  h += '.lb{display:none;position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.92);justify-content:center;align-items:center;flex-direction:column;padding:1rem}';
  h += '.lb.open{display:flex}';
  h += '.lb-img{max-width:90vw;max-height:70vh;border-radius:8px;object-fit:contain;display:flex;align-items:center;justify-content:center;flex-direction:column}';
  h += '.lb-img img{max-width:90vw;max-height:70vh;object-fit:contain;border-radius:8px}';
  h += '.lb-info{text-align:center;margin-top:1rem;color:#fff}';
  h += '.lb-info h4{font-size:1rem;font-weight:600;margin-bottom:.25rem}';
  h += '.lb-info p{font-size:.8125rem;color:rgba(255,255,255,.7);margin-bottom:.75rem}';
  h += '.lb-info .btn{background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.25);backdrop-filter:blur(4px)}';
  h += '.lb-info .btn:hover{background:rgba(255,255,255,.25)}';
  h += '.lb-close{position:absolute;top:1rem;right:1rem;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.1);color:#fff;font-size:1.5rem;display:flex;align-items:center;justify-content:center;cursor:pointer;border:none;z-index:301}';
  h += '.lb-close:hover{background:rgba(255,255,255,.2)}';
  h += '.lb-nav{position:absolute;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.1);color:#fff;font-size:1.25rem;display:flex;align-items:center;justify-content:center;cursor:pointer;border:none;z-index:301}';
  h += '.lb-nav:hover{background:rgba(255,255,255,.2)}';
  h += '.lb-prev{left:1rem}.lb-next{right:1rem}';
  h += '.lb-dots{display:flex;gap:4px;justify-content:center;margin-top:.5rem}';
  h += '.lb-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.4)}';
  h += '.lb-dot.on{background:#fff}';

  // FOOTER
  h += 'footer{background:var(--text);color:#ccc;padding:3rem 1rem;text-align:center;font-size:.8125rem;margin-top:auto}';
  h += 'footer h4{font-family:var(--se);font-size:1.25rem;color:#fff;margin-bottom:.5rem}';
  h += 'footer p{max-width:500px;margin:0 auto .75rem;line-height:1.6}';
  h += '.f-links{display:flex;gap:1.5rem;justify-content:center;margin-top:1rem;flex-wrap:wrap}';
  h += '.f-links a{color:#aaa;font-size:.8125rem}.f-links a:hover{color:#fff}';
  h += '.fc-wrap{margin:1.5rem auto;max-width:700px;text-align:left}';
  h += '.fc-label{font-size:.6875rem;color:#888;margin-bottom:.5rem;text-transform:uppercase;letter-spacing:.06em}';
  h += '.fc-grid{display:flex;flex-wrap:wrap;gap:.375rem}';
  h += '.fc-link{font-size:.75rem;color:#aaa;padding:.25rem .5rem;border:1px solid #444;border-radius:4px;white-space:nowrap;transition:all .15s}';
  h += '.fc-link:hover{color:#fff;border-color:#888}';

  // BREADCRUMB
  h += '.breadcrumb{max-width:720px;margin:0 auto;padding:.75rem 1rem 0;font-size:.8125rem;color:var(--t3)}';
  h += '.breadcrumb a{color:var(--t2);transition:color .15s}';
  h += '.breadcrumb a:hover{color:var(--ac)}';
  h += '.breadcrumb span{margin:0 .375rem}';

  // ICON
  h += '.icon{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;vertical-align:middle}';

  // RESPONSIVE
  h += '@media(max-width:640px){';
  h += '.dp-header{flex-direction:column;align-items:center;text-align:center}';
  h += '.dp-grid{grid-template-columns:1fr}';
  h += '.dp-socials{justify-content:center}';
  h += '.gal-grid{grid-template-columns:repeat(2,1fr)}';
  h += '.nav-r .hm{display:none}';
  h += '.cf-row{flex-direction:column}';
  h += '}';

  h += '</style>';
  h += '</head>';
  h += '<body>';

  // NAV
  h += '<nav class="nav"><div class="nav-in">';
  h += '<a href="/" class="logo">Hair<span>Tattoo</span></a>';
  h += '<div class="nav-r">';
  h += '<a href="/" class="hm">Directory</a>';
  h += '<a href="/" class="hm">Explore</a>';
  h += '<a href="/signup.html" class="btn btn-p">List Your Business</a>';
  h += '</div>';
  h += '</div></nav>';

  // BREADCRUMB
  h += '<div class="breadcrumb">';
  h += '<a href="/">Home</a><span>\u203a</span>';
  h += '<a href="/near-me/' + citySlug + '/">' + esc(l.city) + ', ' + esc(l.state) + '</a><span>\u203a</span>';
  h += esc(l.name);
  h += '</div>';

  // DETAIL PAGE
  h += '<div class="detail-page">';
  h += '<a href="/near-me/' + citySlug + '/" class="dp-back">';
  h += '<svg class="icon" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to ' + esc(l.city) + ' listings';
  h += '</a>';

  h += '<div class="dp-header">';
  h += '<div class="dp-av">' + ini + '</div>';
  h += '<div class="dp-info">';
  h += '<h1 class="dp-name">' + esc(l.name) + '</h1>';
  h += '<div class="dp-loc">' + esc(l.address || '') + ', ' + esc(l.city) + ', ' + esc(l.state) + ' ' + esc(l.zip || '') + '</div>';
  h += '<div class="dp-price">' + esc(pr) + ' \u00b7 Scalp Micropigmentation</div>';
  h += '<div class="dp-socials">' + socHTML + '</div>';
  h += '</div>';
  h += '</div>';

  // About
  h += '<div class="dp-section"><h3>About</h3><p class="dp-about">' + esc(l.about || '') + '</p></div>';

  // Services
  h += '<div class="dp-section"><h3>Services Offered</h3><div class="dp-svcs">' + svcsHTML + '</div></div>';

  // Contact Info
  h += '<div class="dp-section"><h3>Contact Information</h3><div class="dp-grid">';
  h += '<div class="dp-det"><label>Phone</label><a href="tel:' + esc(l.phone) + '">' + esc(l.phone) + '</a></div>';
  h += '<div class="dp-det"><label>Email</label><a href="mailto:' + esc(l.email) + '">' + esc(l.email) + '</a></div>';
  h += '<div class="dp-det"><label>Website</label><a href="' + esc(l.website) + '" target="_blank" rel="noopener">' + esc((l.website || '').replace(/https?:\/\//, '')) + '</a></div>';
  h += '<div class="dp-det"><label>Location</label><span>' + esc(l.city) + ', ' + esc(l.state) + ' ' + esc(l.zip || '') + '</span></div>';
  h += '</div></div>';

  // Gallery
  h += '<div class="dp-section"><h3>Gallery</h3>';
  h += '<div class="gal-grid">' + galleryHTML + '</div>';
  h += '<p style="font-size:.75rem;color:var(--t3);margin-top:.5rem;text-align:center">' + (claimed ? '' : 'Photos will appear when this business claims their page') + '</p>';
  h += '</div>';

  // Contact Form
  h += '<div class="cf" id="contactForm">';
  h += '<h3>\ud83d\udce9 Send a Message to ' + esc(l.name) + '</h3>';
  h += '<div class="cf-row"><input type="text" placeholder="Your Name" id="cfName"><input type="tel" placeholder="Your Phone" id="cfPhone"></div>';
  h += '<div class="cf-row"><textarea placeholder="Hi, I\'m interested in learning more about your SMP services..." id="cfMsg"></textarea></div>';
  h += '<button class="cf-sub" onclick="sendMsg()">Send Message \u2192</button>';
  h += '</div>';

  // Claim
  h += claimHTML;

  h += '</div>'; // end detail-page

  // MESSAGE PANEL
  h += '<div class="msg-overlay" id="msgOverlay" onclick="closeMsgPanel()"></div>';
  h += '<div class="msg-panel" id="msgPanel">';
  h += '<div class="msg-panel-head">';
  h += '<h3>Message ' + esc(l.name) + '</h3>';
  h += '<button onclick="closeMsgPanel()" style="font-size:1.25rem;color:var(--t3);line-height:1">&times;</button>';
  h += '</div>';
  h += '<div class="msg-panel-body" id="msgPanelBody">';
  h += '<label class="mp-label">Your Name</label>';
  h += '<input type="text" id="mpName" placeholder="Full name">';
  h += '<label class="mp-label">Phone Number</label>';
  h += '<input type="tel" id="mpPhone" placeholder="(555) 123-4567">';
  h += '<label class="mp-label">Services Interested In</label>';
  h += '<div class="msg-svcs">' + msgSvcsHTML + '</div>';
  h += '<label class="mp-label">Message</label>';
  h += '<textarea id="mpMsg" placeholder="Hi, I\'m interested in learning more about your SMP services..."></textarea>';
  h += '<label class="msg-consent"><input type="checkbox" id="mpConsent"> I agree to receive SMS/text messages from this business regarding my inquiry. Message & data rates may apply.</label>';
  h += '<button class="msg-submit" onclick="submitMsgPanel()">Send Message \u2192</button>';
  h += '</div>';
  h += '</div>';

  // LIGHTBOX
  h += '<div class="lb" id="lightbox" onclick="if(event.target===this)closeLb()">';
  h += '<button class="lb-close" onclick="closeLb()">\u00d7</button>';
  h += '<button class="lb-nav lb-prev" onclick="lbNav(-1)">\u2039</button>';
  h += '<button class="lb-nav lb-next" onclick="lbNav(1)">\u203a</button>';
  h += '<div class="lb-img" id="lbImg"></div>';
  h += '<div class="lb-info" id="lbInfo"></div>';
  h += '</div>';

  // FOOTER
  h += '<footer>';
  h += '<h4>Hair<span style="color:var(--al)">Tattoo</span></h4>';
  h += '<p>The #1 directory for scalp micropigmentation and hair tattoo professionals in the United States. Connecting people with trusted SMP artists since 2025.</p>';
  h += '<div class="fc-wrap">';
  h += '<p class="fc-label">Popular Cities</p>';
  h += '<div class="fc-grid">' + footerCitiesHTML + '</div>';
  h += '</div>';
  h += '<p style="font-size:.75rem;margin-top:1rem">\u00a9 2025 HairTattoo.com. All rights reserved.</p>';
  h += '<div class="f-links">';
  h += '<a href="/">About</a><a href="/signup.html">For Professionals</a><a href="#">Privacy</a><a href="#">Terms</a><a href="mailto:hello@hairtattoo.com">Contact</a>';
  h += '</div>';
  h += '</footer>';

  // SCRIPTS
  h += '<script>';
  h += 'var SUPABASE_URL=\'' + SUPABASE_URL + '\';';
  h += 'var SUPABASE_ANON=\'' + SUPABASE_ANON + '\';';
  h += 'var LISTING_ID=' + l.id + ';';
  h += 'var LISTING_NAME=\'' + jsName + '\';';
  h += 'var LISTING_CITY=\'' + jsCity + '\';';
  h += 'var LISTING_STATE=\'' + jsState + '\';';
  h += 'var MEDIA_DATA=' + mediaJSON + ';';

  h += 'async function sendMsg(){';
  h += 'var n=document.getElementById("cfName").value.trim();';
  h += 'var p=document.getElementById("cfPhone").value.trim();';
  h += 'var m=document.getElementById("cfMsg").value.trim();';
  h += 'if(!n||!p){alert("Please enter your name and phone number.");return;}';
  h += 'try{';
  h += 'var res=await fetch(SUPABASE_URL+"/rest/v1/leads",{method:"POST",headers:{"apikey":SUPABASE_ANON,"Authorization":"Bearer "+SUPABASE_ANON,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify({listing_id:LISTING_ID,sender_name:n,sender_phone:p,sender_message:m||null})});';
  h += 'if(!res.ok)throw new Error("Failed");';
  h += 'document.getElementById("contactForm").innerHTML=\'<div class="cf-ok">\u2713 Message sent! The artist will reach out to you shortly.</div>\';';
  h += '}catch(e){alert("Something went wrong. Please try again.");}}';

  h += 'function openMsgPanel(){document.getElementById("msgOverlay").classList.add("open");document.getElementById("msgPanel").classList.add("open");document.body.style.overflow="hidden";}';
  h += 'function closeMsgPanel(){document.getElementById("msgOverlay").classList.remove("open");document.getElementById("msgPanel").classList.remove("open");document.body.style.overflow="";}';

  h += 'async function submitMsgPanel(){';
  h += 'var name=document.getElementById("mpName").value.trim();';
  h += 'var phone=document.getElementById("mpPhone").value.trim();';
  h += 'var msg=document.getElementById("mpMsg").value.trim();';
  h += 'var svcs=[];document.querySelectorAll(".msg-svc.on").forEach(function(s){svcs.push(s.textContent);});';
  h += 'if(!name||!phone){alert("Please enter your name and phone number.");return;}';
  h += 'var fullMsg=(svcs.length?"Services: "+svcs.join(", ")+"\\n\\n":"")+(msg||"");';
  h += 'try{';
  h += 'var res=await fetch(SUPABASE_URL+"/rest/v1/leads",{method:"POST",headers:{"apikey":SUPABASE_ANON,"Authorization":"Bearer "+SUPABASE_ANON,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify({listing_id:LISTING_ID,sender_name:name,sender_phone:phone,sender_message:fullMsg||null})});';
  h += 'if(!res.ok)throw new Error("Failed");';
  h += 'document.getElementById("msgPanelBody").innerHTML=\'<div class="msg-ok"><h4>\u2713 Message Sent!</h4><p>The artist will reach out to you shortly.</p><button class="btn btn-o" onclick="closeMsgPanel()">Close</button></div>\';';
  h += '}catch(e){alert("Something went wrong. Please try again.");}}';

  h += 'var lbIdx=0;';
  h += 'function openLb(idx){if(!MEDIA_DATA.length)return;lbIdx=idx||0;renderLb();document.getElementById("lightbox").classList.add("open");document.body.style.overflow="hidden";}';
  h += 'function closeLb(){document.getElementById("lightbox").classList.remove("open");document.body.style.overflow="";}';
  h += 'function lbNav(dir){lbIdx=(lbIdx+dir+MEDIA_DATA.length)%MEDIA_DATA.length;renderLb();}';
  h += 'function renderLb(){var item=MEDIA_DATA[lbIdx];if(!item)return;var el=document.getElementById("lbImg");el.style.background="#111";el.innerHTML=\'<img src="\'+item.url+\'" alt="\'+LISTING_NAME+\'" style="max-width:90vw;max-height:70vh;object-fit:contain;border-radius:8px">\'+(item.isPlaceholder?\'<span class="c-pill" style="position:absolute;bottom:1rem;left:1rem">\ud83d\udcf7 Sample photo</span>\':"")+\'\';';
  h += 'var dots="";if(MEDIA_DATA.length>1){dots=\'<div class="lb-dots">\';for(var i=0;i<MEDIA_DATA.length;i++){dots+=\'<span class="lb-dot\'+(i===lbIdx?" on":"")+"\">"+"</span>";}dots+="</div>";}';
  h += 'document.getElementById("lbInfo").innerHTML="<h4>"+LISTING_NAME+"</h4><p>"+LISTING_CITY+", "+LISTING_STATE+"</p>"+dots;}';

  h += 'document.addEventListener("keydown",function(e){';
  h += 'if(e.key==="Escape"){closeMsgPanel();closeLb();}';
  h += 'if(document.getElementById("lightbox").classList.contains("open")){';
  h += 'if(e.key==="ArrowLeft")lbNav(-1);';
  h += 'if(e.key==="ArrowRight")lbNav(1);}});';

  h += '<\/script>';

  h += '<script type="application/ld+json">' + schema + '<\/script>';
  h += '</body>';
  h += '</html>';

  return h;
}
