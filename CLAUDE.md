# HairTattoo.com

## Project Overview
SMP (scalp micropigmentation) business directory. Static site hosted on Cloudflare Pages, auto-deploys from this GitHub repo (vanxan/hairtattoo).

## Architecture
- Single-file app: index.html (242KB, 348 listings embedded as JSON)
- Static city SEO pages: /smp/{city-state}/index.html (292 city pages)
- Hash routing for individual listings: /#/business-slug
- No backend yet (Supabase planned)
- No build step — raw static files

## Key Files
- index.html — Main app (directory, explore feed, detail pages, signup modal, lightbox)
- /smp/ — City landing pages for SEO
- sitemap.xml — 294 URLs
- robots.txt — All crawlers allowed

## Deployment
- Push to main branch → Cloudflare Pages auto-deploys
- Domain: hairtattoo.com (DNS propagating from Squarespace to Cloudflare)
- Staging: hairtattoo.pages.dev

## Design System
- Fonts: DM Sans (body), Instrument Serif (display)
- Colors: #2D5A3D (accent green), #FAFAF8 (bg), #1A1A1A (text)
- No external dependencies — everything inline

## Roadmap
- Signup → verify → page builder flow
- Supabase backend for data persistence
- Contact form email/SMS delivery
- Image uploads
- Template is designed to be reusable for other industry verticals
