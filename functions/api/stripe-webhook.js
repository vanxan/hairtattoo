const SB_URL = 'https://ingorrzmoudvoknhwjjb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluZ29ycnptb3Vkdm9rbmh3ampiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDY1NTIsImV4cCI6MjA4NjIyMjU1Mn0.rpcraVuvgRWX1NJtZyUQAzDp4rZhw4cpRm4dRx9yxJc';

async function verifyStripeSignature(payload, sigHeader, secret) {
  const parts = sigHeader.split(',').reduce((acc, part) => {
    const [key, val] = part.split('=');
    acc[key] = val;
    return acc;
  }, {});

  const timestamp = parts['t'];
  const signature = parts['v1'];
  if (!timestamp || !signature) return false;

  // Reject if timestamp is older than 5 minutes
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (age > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  return computed === signature;
}

async function updateListing(listingId, data) {
  const res = await fetch(
    `${SB_URL}/rest/v1/listings?id=eq.${listingId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(data),
    }
  );
  return res.ok;
}

async function findListingByCustomer(customerId) {
  const res = await fetch(
    `${SB_URL}/rest/v1/listings?stripe_customer_id=eq.${encodeURIComponent(customerId)}&select=id&limit=1`,
    { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
  );
  const rows = await res.json();
  return rows && rows.length ? rows[0] : null;
}

async function findListingBySubscription(subscriptionId) {
  const res = await fetch(
    `${SB_URL}/rest/v1/listings?stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}&select=id&limit=1`,
    { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
  );
  const rows = await res.json();
  return rows && rows.length ? rows[0] : null;
}

export async function onRequestPost(context) {
  const WEBHOOK_SECRET = context.env.STRIPE_WEBHOOK_SECRET;
  const body = await context.request.text();
  const sig = context.request.headers.get('stripe-signature');

  if (!sig || !(await verifyStripeSignature(body, sig, WEBHOOK_SECRET))) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(body);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const listingId = session.metadata?.listing_id;
      if (!listingId) break;

      const promotedUntil = new Date();
      promotedUntil.setDate(promotedUntil.getDate() + 30);

      await updateListing(listingId, {
        promoted: true,
        promoted_until: promotedUntil.toISOString(),
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
      });
      break;
    }

    case 'invoice.paid': {
      // Renewal — extend promoted_until by 30 days
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      if (!subscriptionId) break;

      const listing = await findListingBySubscription(subscriptionId);
      if (!listing) break;

      const promotedUntil = new Date();
      promotedUntil.setDate(promotedUntil.getDate() + 30);

      await updateListing(listing.id, {
        promoted: true,
        promoted_until: promotedUntil.toISOString(),
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const listing = await findListingBySubscription(sub.id) ||
                      await findListingByCustomer(sub.customer);
      if (!listing) break;

      await updateListing(listing.id, {
        promoted: false,
        promoted_until: null,
        stripe_subscription_id: null,
      });
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      if (sub.status === 'past_due' || sub.status === 'canceled' || sub.status === 'unpaid') {
        const listing = await findListingBySubscription(sub.id) ||
                        await findListingByCustomer(sub.customer);
        if (listing) {
          await updateListing(listing.id, {
            promoted: false,
            promoted_until: null,
          });
        }
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
