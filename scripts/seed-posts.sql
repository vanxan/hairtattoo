-- Seed 5 test posts for INK INK (listing_id: 786)
-- Run in Supabase SQL Editor AFTER running add-posts-table.sql

INSERT INTO posts (id, listing_id, body, created_at) VALUES
  ('a0000001-0000-0000-0000-000000000001', 786, 'Fresh SMP session — full density restoration. Client came in with Norwood 5 pattern. Three sessions, each about 3 hours. The hairline was designed to match his natural growth pattern from old photos.', now() - interval '2 days'),
  ('a0000001-0000-0000-0000-000000000002', 786, 'Before and after on this crown fill. No more bald spot catching the light. This is why I love what I do.', now() - interval '5 days'),
  ('a0000001-0000-0000-0000-000000000003', 786, 'Scar camouflage work from today. FUT strip scar completely blended after two sessions. The key is matching the surrounding follicle density exactly.', now() - interval '8 days'),
  ('a0000001-0000-0000-0000-000000000004', 786, 'Another happy client! Receded hairline restored with a soft, natural look. Age-appropriate density — the goal is always to look like you never lost it.', now() - interval '12 days'),
  ('a0000001-0000-0000-0000-000000000005', 786, 'Studio vibes. New needle cartridges just arrived — upgraded to the latest gen for even more precise dot placement. Always investing in the best tools.', now() - interval '15 days');
