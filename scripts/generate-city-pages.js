const{createClient}=require('@supabase/supabase-js');
const fs=require('fs');
const path=require('path');

const SB=createClient(
  'https://ingorrzmoudvoknhwjjb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc'
);
const MEDIA_BASE='https://ingorrzmoudvoknhwjjb.supabase.co/storage/v1/object/public/placeholders/';

function esc(s){
  if(!s)return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function mediaUrl(p){return MEDIA_BASE+encodeURIComponent(p);}
function citySlug(city,state){return city.toLowerCase().replace(/\s+/g,'-')+'-'+state.toLowerCase();}
function listingUrl(l){return '/near-me/'+citySlug(l.city,l.state)+'/'+l.slug;}
function stateName(abbr){
  var m={'AL':'Alabama','AK':'Alaska','AZ':'Arizona','AR':'Arkansas','CA':'California','CO':'Colorado','CT':'Connecticut','DE':'Delaware','FL':'Florida','GA':'Georgia','HI':'Hawaii','ID':'Idaho','IL':'Illinois','IN':'Indiana','IA':'Iowa','KS':'Kansas','KY':'Kentucky','LA':'Louisiana','ME':'Maine','MD':'Maryland','MA':'Massachusetts','MI':'Michigan','MN':'Minnesota','MS':'Mississippi','MO':'Missouri','MT':'Montana','NE':'Nebraska','NV':'Nevada','NH':'New Hampshire','NJ':'New Jersey','NM':'New Mexico','NY':'New York','NC':'North Carolina','ND':'North Dakota','OH':'Ohio','OK':'Oklahoma','OR':'Oregon','PA':'Pennsylvania','RI':'Rhode Island','SC':'South Carolina','SD':'South Dakota','TN':'Tennessee','TX':'Texas','UT':'Utah','VT':'Vermont','VA':'Virginia','WA':'Washington','WV':'West Virginia','WI':'Wisconsin','WY':'Wyoming','DC':'District of Columbia'};
  return m[abbr.toUpperCase()]||abbr;
}

// Haversine distance in miles
function dist(lat1,lng1,lat2,lng2){
  var R=3959,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
  var a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

const TOP_CITIES=['New York, NY','Los Angeles, CA','Houston, TX','Chicago, IL','Miami Beach, FL','Atlanta, GA','Phoenix, AZ','Dallas, TX','San Francisco, CA','Seattle, WA','Boston, MA','Denver, CO','Austin, TX','Nashville, TN','Tampa, FL','Fort Lauderdale, FL','San Diego, CA','Philadelphia, PA','Charlotte, NC','Las Vegas, NV','Portland, OR','Scottsdale, AZ','Boca Raton, FL','Fort Worth, TX','Beverly Hills, CA'];

// CSS matching index.html exactly — shared base + city page specific
const CSS=`*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#FAFAF8;--card:#FFF;--text:#1A1A1A;--t2:#555;--t3:#888;--ac:#2D5A3D;--ac2:#3A7350;--al:#E8F0EB;--bd:#E8E6E3;--sh:0 1px 3px rgba(0,0,0,.06);--r:12px;--rs:8px;--f:'DM Sans',system-ui,sans-serif;--se:'Instrument Serif',Georgia,serif}
html{font-size:16px;scroll-behavior:smooth}
body{font-family:var(--f);background:var(--bg);color:var(--text);line-height:1.5;-webkit-font-smoothing:antialiased;display:flex;flex-direction:column;min-height:100vh}
a{color:var(--ac);text-decoration:none}
button{font-family:var(--f);cursor:pointer;border:none;background:none}
input,textarea,select{font-family:var(--f);font-size:1rem}
.nav{position:sticky;top:0;z-index:100;background:rgba(250,250,248,.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--bd);padding:0 1rem}
.nav-in{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:56px}
.logo{font-family:var(--se);font-size:1.5rem;color:var(--text);letter-spacing:-.02em}
.logo span{color:var(--ac)}
.nav-r{display:flex;gap:.75rem;align-items:center}
.nav-r a{color:var(--t2);font-size:.875rem;font-weight:500;transition:color .15s}
.nav-r a:hover{color:var(--ac)}
.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.5rem 1rem;border-radius:var(--rs);font-size:.875rem;font-weight:500;transition:all .15s}
.btn-p{background:var(--ac);color:#fff}.btn-p:hover{background:var(--ac2)}
.btn-o{border:1px solid var(--bd);color:var(--text)}.btn-o:hover{border-color:var(--ac);color:var(--ac)}
.hero{padding:2.5rem 1rem 1.5rem;text-align:center;max-width:700px;margin:0 auto}
.hero h1{font-family:var(--se);font-size:clamp(1.75rem,4vw,2.5rem);font-weight:400;line-height:1.2;margin-bottom:.5rem;letter-spacing:-.02em}
.hero h1 em{font-style:italic;color:var(--ac)}
.hero p{color:var(--t2);font-size:1rem;max-width:540px;margin:0 auto .5rem}
.hero .count{font-size:.875rem;color:var(--ac);font-weight:600}
.breadcrumb{max-width:1200px;margin:0 auto;padding:.75rem 1rem;font-size:.8125rem;color:var(--t3)}
.breadcrumb a{color:var(--t2)}.breadcrumb a:hover{color:var(--ac)}
.main{max-width:1200px;margin:0 auto;padding:0 1rem 2rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:1rem}
.card{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);overflow:hidden;transition:box-shadow .15s,transform .1s;cursor:pointer}
.card:hover{box-shadow:0 4px 20px rgba(0,0,0,.08);transform:translateY(-2px)}
.c-img{position:relative;width:100%;height:180px;overflow:hidden;background:var(--al)}
.c-img img{width:100%;height:100%;object-fit:cover;display:block}
.c-pill{position:absolute;bottom:8px;left:8px;background:rgba(255,255,255,.85);backdrop-filter:blur(4px);padding:2px 8px;border-radius:12px;font-size:.625rem;color:var(--t2);pointer-events:none}
.c-head{padding:1.25rem 1.25rem .5rem;display:flex;gap:.75rem;align-items:flex-start}
.c-av{width:44px;height:44px;border-radius:50%;background:var(--al);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:var(--se);font-size:1.125rem;color:var(--ac)}
.c-info{flex:1;min-width:0}
.c-name{font-weight:700;font-size:.9375rem;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.c-loc{font-size:.8125rem;color:var(--t2);margin-top:1px}
.c-pr{font-size:.8125rem;font-weight:600;color:var(--ac);white-space:nowrap}
.c-body{padding:0 1.25rem .5rem}
.c-about{font-size:.8125rem;color:var(--t2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.c-tags{padding:0 1.25rem .75rem;display:flex;flex-wrap:wrap;gap:.25rem}
.c-tag{font-size:.6875rem;padding:.125rem .5rem;background:var(--al);color:var(--ac);border-radius:4px}
.c-foot{padding:.5rem 1.25rem;border-top:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between;font-size:.8125rem}
.c-foot .btn{font-size:.8125rem;padding:.375rem .75rem}
.nearby{max-width:1200px;margin:0 auto;padding:1.5rem 1rem 1rem}
.nearby h3{font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:var(--t3);margin-bottom:.625rem}
.nearby-links{display:flex;flex-wrap:wrap;gap:.375rem}
.nearby-links a{font-size:.8125rem;padding:.375rem .75rem;border:1px solid var(--bd);border-radius:20px;color:var(--t2);background:var(--card);transition:all .15s}
.nearby-links a:hover{border-color:var(--ac);color:var(--ac)}
.nearby-links a span{color:var(--t3);font-size:.75rem}
.cta{max-width:1200px;margin:0 auto;padding:1.5rem 1rem 2rem;text-align:center}
.cta-box{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;padding:2rem;border-radius:var(--r)}
.cta-box h3{font-family:var(--se);font-size:1.5rem;margin-bottom:.5rem}
.cta-box p{font-size:.9375rem;opacity:.85;margin-bottom:1rem;max-width:400px;margin-left:auto;margin-right:auto}
.cta-box .btn{background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.3)}
.cta-box .btn:hover{background:rgba(255,255,255,.3)}
footer{background:var(--text);color:#ccc;padding:3rem 1rem;text-align:center;font-size:.8125rem;margin-top:auto}
footer h4{font-family:var(--se);font-size:1.25rem;color:#fff;margin-bottom:.5rem}
footer p{max-width:500px;margin:0 auto .75rem;line-height:1.6}
.f-links{display:flex;gap:1.5rem;justify-content:center;margin-top:1rem;flex-wrap:wrap}
.f-links a{color:#aaa;font-size:.8125rem}.f-links a:hover{color:#fff}
.fc-wrap{margin:1.5rem auto;max-width:700px;text-align:left}
.fc-label{font-size:.6875rem;color:#888;margin-bottom:.5rem;text-transform:uppercase;letter-spacing:.06em}
.fc-grid{display:flex;flex-wrap:wrap;gap:.375rem}
.fc-link{font-size:.75rem;color:#aaa;padding:.25rem .5rem;border:1px solid #444;border-radius:4px;white-space:nowrap;transition:all .15s}
.fc-link:hover{color:#fff;border-color:#888}
@media(max-width:640px){.grid{grid-template-columns:1fr}.nav-r .hm{display:none}.hero h1{font-size:1.75rem}}`;

function navHTML(){
  return `<nav class="nav"><div class="nav-in">
  <a href="/" class="logo">Hair<span>Tattoo</span></a>
  <div class="nav-r">
    <a href="/" class="hm">Directory</a>
    <a href="/" class="hm">Explore</a>
    <a href="/signup.html" class="btn btn-p">List Your Business</a>
  </div>
</div></nav>`;
}

function footerHTML(){
  var cities=TOP_CITIES.map(function(c){
    var p=c.split(', ');
    var s=p[0].toLowerCase().replace(/\s+/g,'-')+'-'+p[1].toLowerCase();
    return '<a href="/near-me/'+s+'/" class="fc-link">'+c+'</a>';
  }).join('');
  return `<footer>
  <h4>Hair<span style="color:var(--al)">Tattoo</span></h4>
  <p>The #1 directory for scalp micropigmentation and hair tattoo professionals in the United States. Connecting people with trusted SMP artists since 2025.</p>
  <div class="fc-wrap">
    <p class="fc-label">Popular Cities</p>
    <div class="fc-grid">${cities}</div>
  </div>
  <p style="font-size:.75rem;margin-top:1rem">\u00a9 2025 HairTattoo.com. All rights reserved.</p>
  <div class="f-links">
    <a href="/">About</a><a href="/signup.html">For Professionals</a><a href="#">Privacy</a><a href="#">Terms</a><a href="mailto:hello@hairtattoo.com">Contact</a>
  </div>
</footer>`;
}

function renderCard(l, media){
  var ini=l.name.split(' ').map(function(w){return w[0];}).slice(0,2).join('');
  var pr=l.price_range||'$$';
  var svcs=(l.services||[]).slice(0,4).map(function(s){return '<span class="c-tag">'+esc(s)+'</span>';}).join('');
  var url=listingUrl(l);
  var thumb='';
  if(media&&media.length){
    var m=media[0];
    thumb='<div class="c-img"><img src="'+mediaUrl(m.storage_path)+'" loading="lazy" width="400" height="180" alt="'+esc(l.name)+' SMP">'+(m.is_placeholder?'<span class="c-pill">\ud83d\udcf7 Sample photo</span>':'')+'</div>';
  }
  return '<article class="card" onclick="location.href=\''+url+'\'" itemscope itemtype="https://schema.org/LocalBusiness">\n'+
    '      '+thumb+'\n'+
    '      <div class="c-head"><div class="c-av">'+ini+'</div><div class="c-info"><div class="c-name" itemprop="name">'+esc(l.name)+'</div><div class="c-loc"><span itemprop="address">'+esc(l.city)+', '+esc(l.state)+'</span></div></div><div class="c-pr">'+esc(pr)+'</div></div>\n'+
    '      <div class="c-body"><p class="c-about" itemprop="description">'+esc(l.about)+'</p></div>\n'+
    '      <div class="c-tags">'+svcs+'</div>\n'+
    '      <div class="c-foot"><a class="btn btn-o" href="'+url+'">View Profile</a><a class="btn btn-p" href="'+url+'">Contact</a></div>\n'+
    '    </article>';
}

function renderPage(city, state, listings, allCities, mediaMap){
  var cs=citySlug(city,state);
  var sn=stateName(state);
  var count=listings.length;
  var plural=count===1?'artist':'artists';
  var title='Hair Tattoo & SMP Artists in '+city+', '+state+' | HairTattoo.com';
  var desc='Find '+count+' verified scalp micropigmentation and hair tattoo '+plural+' in '+city+', '+sn+'. Compare services, pricing, and contact SMP professionals near you.';

  // Cards
  var cards=listings.map(function(l){return renderCard(l, mediaMap[l.id]);}).join('\n');

  // Nearby cities (same state, sorted by distance)
  var refLat=listings[0].lat, refLng=listings[0].lng;
  var nearby=allCities
    .filter(function(c){return !(c.city===city&&c.state===state);})
    .map(function(c){c._d=dist(refLat,refLng,c.lat,c.lng);return c;})
    .sort(function(a,b){return a._d-b._d;})
    .slice(0,12);
  var nearbyHTML=nearby.map(function(c){
    return '<a href="/near-me/'+citySlug(c.city,c.state)+'/">'+c.city+', '+c.state+' <span>('+c.count+')</span></a>';
  }).join('');

  // Schema
  var schemas=listings.map(function(l){
    return '<script type="application/ld+json">'+JSON.stringify({
      '@context':'https://schema.org','@type':'LocalBusiness','name':l.name,
      'address':{'@type':'PostalAddress','streetAddress':l.address,'addressLocality':l.city,'addressRegion':l.state,'postalCode':l.zip,'addressCountry':'US'},
      'telephone':l.phone,'email':l.email,'url':l.website,'description':l.about,
      'geo':{'@type':'GeoCoordinates','latitude':l.lat,'longitude':l.lng},
      'makesOffer':(l.services||[]).map(function(s){return {'@type':'Offer','itemOffered':{'@type':'Service','name':s}};})
    })+'<\/script>';
  }).join('\n');

  var webPageSchema='<script type="application/ld+json">\n'+JSON.stringify({
    '@context':'https://schema.org','@type':'WebPage',
    'name':title,'description':desc,
    'url':'https://hairtattoo.com/near-me/'+cs+'/',
    'isPartOf':{'@type':'WebSite','name':'HairTattoo','url':'https://hairtattoo.com'}
  })+'\n<\/script>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="https://hairtattoo.com/near-me/${cs}/">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="https://hairtattoo.com/near-me/${cs}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="HairTattoo">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#2D5A3D">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>\ud83d\udc88</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<style>
${CSS}
</style>
${schemas}
${webPageSchema}
</head>
<body>
${navHTML()}
<div class="breadcrumb"><a href="/">HairTattoo</a> \u203a <a href="/near-me/">Near Me</a> \u203a ${esc(city)}, ${esc(state)}</div>
<section class="hero">
  <h1><em>Hair Tattoo</em> Artists in ${esc(city)}, ${esc(state)}</h1>
  <p>Browse verified scalp micropigmentation professionals in ${esc(city)}, ${esc(sn)}. Compare services, view pricing, and connect with SMP artists near you.</p>
  <div class="count">${count} SMP ${plural} found</div>
</section>
<div class="main"><div class="grid">${cards}</div></div>
${nearbyHTML?'<div class="nearby">\n    <h3>SMP Artists in Nearby Cities</h3>\n    <div class="nearby-links">'+nearbyHTML+'</div>\n  </div>':''}
<div class="cta"><div class="cta-box">
  <h3>SMP Professional in ${esc(city)}?</h3>
  <p>List your business for free and start getting leads from local clients.</p>
  <a href="/signup.html" class="btn">List Your Business \u2192</a>
</div></div>
${footerHTML()}
</body>
</html>`;
}

async function main(){
  console.log('Fetching listings...');
  var{data:listings,error}=await SB.from('listings').select('*');
  if(error){console.error('Failed:',error.message);process.exit(1);}
  console.log('Got '+listings.length+' listings');

  console.log('Fetching media...');
  var{data:media}=await SB.from('media').select('*').order('sort_order',{ascending:true});
  var mediaMap={};
  if(media){media.forEach(function(m){if(!mediaMap[m.listing_id])mediaMap[m.listing_id]=[];mediaMap[m.listing_id].push(m);});}
  console.log('Got '+(media?media.length:0)+' media items');

  // Group by city+state
  var groups={};
  listings.forEach(function(l){
    var key=l.city+'|'+l.state;
    if(!groups[key])groups[key]=[];
    groups[key].push(l);
  });

  // Build allCities summary for nearby links
  var allCities=Object.keys(groups).map(function(key){
    var parts=key.split('|');
    var items=groups[key];
    return {city:parts[0],state:parts[1],count:items.length,lat:items[0].lat,lng:items[0].lng};
  });

  var nearMeDir=path.join(__dirname,'..','near-me');
  var generated=0;

  Object.keys(groups).forEach(function(key){
    var parts=key.split('|');
    var city=parts[0],state=parts[1];
    var items=groups[key];
    var cs=citySlug(city,state);
    var dir=path.join(nearMeDir,cs);

    if(!fs.existsSync(dir))fs.mkdirSync(dir,{recursive:true});

    var html=renderPage(city,state,items,allCities,mediaMap);
    fs.writeFileSync(path.join(dir,'index.html'),html,'utf8');
    generated++;
  });

  console.log('Generated '+generated+' city pages');
}

main().catch(function(e){console.error(e);process.exit(1);});
