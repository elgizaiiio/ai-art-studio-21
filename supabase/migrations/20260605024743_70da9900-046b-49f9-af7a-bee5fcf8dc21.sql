
-- 1. tasks: extra columns expected by admin/bot code
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS verify_type text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS verify_target text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- backfill from legacy columns where present
UPDATE public.tasks SET link = url WHERE link IS NULL AND url IS NOT NULL;
UPDATE public.tasks SET active = is_active WHERE active IS DISTINCT FROM is_active;

-- 2. transactions: extra columns for payments + notifications
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS kind text,
  ADD COLUMN IF NOT EXISTS method text,
  ADD COLUMN IF NOT EXISTS amount_usd numeric,
  ADD COLUMN IF NOT EXISTS amount_stars integer,
  ADD COLUMN IF NOT EXISTS amount_points integer,
  ADD COLUMN IF NOT EXISTS external_id text;

-- 3. bot_events: add event + telegram_id
ALTER TABLE public.bot_events
  ADD COLUMN IF NOT EXISTS event text,
  ADD COLUMN IF NOT EXISTS telegram_id bigint,
  ADD COLUMN IF NOT EXISTS metadata jsonb;
UPDATE public.bot_events SET event = type WHERE event IS NULL AND type IS NOT NULL;

-- 4. Seed the 6 community tasks (English, 6 points each).
INSERT INTO public.tasks (title, description, link, reward, active, verify_type, verify_target, sort_order)
VALUES
  ('Join Gram AI community', 'Join our official Gram AI Telegram channel to stay updated.',
   'https://t.me/gramaic', 6, true, 'telegram_channel', '-1002616088306', 10),
  ('Join Megsy community', 'Join the Megsy AI Telegram community.',
   'https://t.me/megsyai', 6, true, 'telegram_channel', '-1003963415632', 20),
  ('Follow Megsy on X', 'Follow @megsyai on X (Twitter).',
   'https://x.com/megsyai', 6, true, 'manual', NULL, 30),
  ('Follow Megsy on Instagram', 'Follow @megsyaiio on Instagram.',
   'https://www.instagram.com/megsyaiio', 6, true, 'manual', NULL, 40),
  ('Follow Megsy on TikTok', 'Follow @megsyai on TikTok.',
   'https://www.tiktok.com/@megsyai', 6, true, 'manual', NULL, 50),
  ('Visit Megsy AI', 'Open megsyai.com and check out the AI suite.',
   'https://megsyai.com', 6, true, 'manual', NULL, 60)
ON CONFLICT DO NOTHING;
