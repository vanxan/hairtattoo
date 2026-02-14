import { citySlug } from '../templates/shared.js';

const SB_URL = 'https://ingorrzmoudvoknhwjjb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc';

export async function onRequestGet(context) {
  const slug = context.params.slug;

  // Skip known static paths
  if (['favicon.ico', 'robots.txt', 'sitemap.xml', '_headers'].includes(slug)) {
    return context.next();
  }

  const res = await fetch(
    `${SB_URL}/rest/v1/listings?slug=eq.${encodeURIComponent(slug)}&select=slug,city,state,promoted,promoted_until&limit=1`,
    { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
  );
  const listings = await res.json();

  if (!listings || !listings.length) {
    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/html' } });
  }

  const l = listings[0];
  const isPromoted = l.promoted && l.promoted_until && new Date(l.promoted_until) > new Date();

  if (!isPromoted) {
    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/html' } });
  }

  const cs = citySlug(l.city, l.state);
  const destination = `https://hairtattoo.com/near-me/${cs}/${l.slug}`;

  return new Response(null, {
    status: 301,
    headers: { 'Location': destination }
  });
}
