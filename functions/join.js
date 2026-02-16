const SB_URL = 'https://ingorrzmoudvoknhwjjb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const ref = url.searchParams.get('ref');

  // No ref param — just redirect to signup
  if (!ref) {
    return Response.redirect('https://hairtattoo.com/for-professionals', 302);
  }

  // Validate referral code — look up the listing
  const listingRes = await fetch(
    `${SB_URL}/rest/v1/listings?referral_code=eq.${encodeURIComponent(ref)}&select=id,name,referral_code&limit=1`,
    { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
  );
  const listings = await listingRes.json();

  if (!listings || !listings.length) {
    // Invalid ref — redirect to signup without cookie
    return Response.redirect('https://hairtattoo.com/for-professionals', 302);
  }

  const listing = listings[0];

  // Generate a random visitor ID
  const visitorId = crypto.randomUUID();

  // Insert referral click record
  await fetch(`${SB_URL}/rest/v1/referrals`, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      referrer_listing_id: listing.id,
      referral_code: ref,
      status: 'clicked',
      visitor_id: visitorId
    })
  });

  // Set cookie and redirect to signup
  const redirectUrl = 'https://hairtattoo.com/signup.html';
  return new Response(null, {
    status: 302,
    headers: {
      'Location': redirectUrl,
      'Set-Cookie': `ht_ref=${encodeURIComponent(ref)}; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax; Secure`
    }
  });
}
