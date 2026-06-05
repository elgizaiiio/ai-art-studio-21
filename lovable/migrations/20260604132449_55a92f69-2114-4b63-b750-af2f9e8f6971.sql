
-- Users table (Telegram-based auth via initData)
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  language_code TEXT,
  points INTEGER NOT NULL DEFAULT 50,
  referred_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  ton_wallet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_telegram_id ON public.users(telegram_id);
CREATE INDEX idx_users_referred_by ON public.users(referred_by);

-- Tasks (admin-managed)
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT,
  link TEXT NOT NULL,
  reward INTEGER NOT NULL DEFAULT 10,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task completions
CREATE TABLE public.task_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_id)
);

-- Conversations
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  attachments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conv ON public.messages(conversation_id, created_at);

-- Generations (images/videos)
CREATE TABLE public.generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image','video','doc','slide')),
  model TEXT,
  prompt TEXT NOT NULL,
  result_url TEXT,
  cost INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_generations_user ON public.generations(user_id, created_at DESC);

-- Templates (prompt templates for image/video)
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('image','video')),
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  prompt TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admins (telegram_ids allowed to use bot admin panel)
CREATE TABLE public.admins (
  telegram_id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_conv_updated BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed sample tasks
INSERT INTO public.tasks (title, image_url, link, reward, sort_order) VALUES
  ('Join our Telegram channel', null, 'https://t.me/telegram', 25, 1),
  ('Follow us on X', null, 'https://x.com', 20, 2),
  ('Subscribe to YouTube', null, 'https://youtube.com', 30, 3);

-- Seed sample templates
INSERT INTO public.templates (type, name, description, prompt, sort_order) VALUES
  ('image', 'Cinematic Portrait', 'Studio-quality portrait', 'cinematic portrait of a person, soft lighting, 85mm lens, ultra detailed, 8k', 1),
  ('image', 'Anime Style', 'Vibrant anime illustration', 'anime style illustration, vibrant colors, detailed background, studio ghibli inspired', 2),
  ('image', 'Product Mockup', 'Clean product shot', 'minimalist product photography on white background, soft shadows, commercial quality', 3),
  ('image', 'Fantasy Landscape', 'Epic environment', 'epic fantasy landscape, dramatic clouds, mountains, golden hour, matte painting', 4),
  ('video', 'Smooth Camera Pan', 'Cinematic motion', 'slow cinematic camera pan across the scene, smooth motion, film grain', 1),
  ('video', 'Product Showcase', '360 spin', '360 degree product rotation, studio lighting, clean white background', 2);
