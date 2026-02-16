const SB_URL = 'https://ingorrzmoudvoknhwjjb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc';

export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const { listing_id } = await context.request.json();
    if (!listing_id) {
      return new Response(JSON.stringify({ error: 'listing_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Look up listing's stripe_customer_id
    const listingRes = await fetch(
      `${SB_URL}/rest/v1/listings?id=eq.${listing_id}&select=id,stripe_customer_id`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    );
    const listings = await listingRes.json();
    if (!listings || !listings.length || !listings[0].stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No Stripe customer found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const STRIPE_KEY = context.env.STRIPE_SECRET_KEY;
    const params = new URLSearchParams();
    params.append('customer', listings[0].stripe_customer_id);
    params.append('return_url', 'https://hairtattoo.com/dashboard.html');

    const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await portalRes.json();
    if (session.error) {
      return new Response(JSON.stringify({ error: session.error.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
