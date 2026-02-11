import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "HairTattoo <notifications@hairtattoo.com>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    // Support both direct invocation and database webhook trigger format
    const record = payload.record ?? payload;
    const { listing_id, sender_name, sender_phone, sender_message } = record;

    if (!listing_id) {
      return new Response(JSON.stringify({ error: "missing listing_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the listing to get the owner's email
    const sb = createClient(SB_URL, SB_SERVICE_KEY);
    const { data: listing, error: listingErr } = await sb
      .from("listings")
      .select("id, name, email, city, state, slug")
      .eq("id", listing_id)
      .limit(1)
      .maybeSingle();

    if (listingErr || !listing) {
      console.error("Listing lookup failed:", listingErr);
      return new Response(JSON.stringify({ error: "listing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!listing.email) {
      console.log("No email on listing", listing_id, "— skipping notification");
      return new Response(JSON.stringify({ skipped: true, reason: "no email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build branded HTML email
    const name = escHtml(sender_name || "Someone");
    const phone = escHtml(sender_phone || "Not provided");
    const message = escHtml(sender_message || "No message");
    const bizName = escHtml(listing.name);

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAFAF8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1A1A1A">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">

  <!-- Header -->
  <div style="text-align:center;padding:24px 0 20px;border-bottom:1px solid #E8E6E3">
    <span style="font-size:24px;font-weight:400;letter-spacing:-0.02em;color:#1A1A1A">Hair<span style="color:#2D5A3D">Tattoo</span></span>
  </div>

  <!-- Content -->
  <div style="padding:32px 0 24px">
    <h1 style="font-size:20px;font-weight:700;margin:0 0 8px;color:#1A1A1A">You have a new inquiry!</h1>
    <p style="font-size:14px;color:#555;margin:0 0 24px;line-height:1.5">Someone is interested in your SMP services at <strong>${bizName}</strong>.</p>

    <!-- Lead card -->
    <div style="background:#FFFFFF;border:1px solid #E8E6E3;border-radius:12px;padding:20px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:6px 12px 6px 0;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.04em;vertical-align:top;width:80px">Name</td>
          <td style="padding:6px 0;font-size:15px;color:#1A1A1A">${name}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px 6px 0;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.04em;vertical-align:top">Phone</td>
          <td style="padding:6px 0;font-size:15px;color:#1A1A1A"><a href="tel:${escAttr(sender_phone || "")}" style="color:#2D5A3D;text-decoration:none">${phone}</a></td>
        </tr>
        <tr>
          <td style="padding:6px 12px 6px 0;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.04em;vertical-align:top">Message</td>
          <td style="padding:6px 0;font-size:15px;color:#1A1A1A;line-height:1.5">${message}</td>
        </tr>
      </table>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:24px">
      <a href="https://hairtattoo.com/dashboard.html" style="display:inline-block;padding:12px 32px;background:#2D5A3D;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none">View in Your Dashboard &rarr;</a>
    </div>

    <p style="font-size:13px;color:#888;text-align:center;line-height:1.5">Respond quickly — leads that get a reply within 1 hour are 7x more likely to book.</p>
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #E8E6E3;padding:20px 0;text-align:center">
    <p style="font-size:12px;color:#888;margin:0 0 4px">Hair<span style="color:#2D5A3D">Tattoo</span> — The #1 SMP directory</p>
    <p style="font-size:11px;color:#aaa;margin:0">You're receiving this because you have a listing on <a href="https://hairtattoo.com" style="color:#2D5A3D;text-decoration:none">hairtattoo.com</a></p>
  </div>

</div>
</body>
</html>`;

    const subject = `New lead from ${sender_name || "a potential client"} on HairTattoo.com`;

    // Send via Resend API
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set — logging email instead of sending");
      console.log("TO:", listing.email, "SUBJECT:", subject);
      return new Response(JSON.stringify({ logged: true, to: listing.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [listing.email],
        subject,
        html,
      }),
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      console.error("Resend API error:", emailData);
      return new Response(JSON.stringify({ error: "email send failed", details: emailData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Email sent to", listing.email, "resend_id:", emailData.id);
    return new Response(JSON.stringify({ success: true, email_id: emailData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("notify-lead error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(s: string): string {
  return String(s || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
