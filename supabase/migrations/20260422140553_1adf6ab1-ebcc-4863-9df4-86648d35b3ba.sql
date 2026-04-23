-- =========================================
-- 1. user_story_progress
-- =========================================
CREATE TABLE public.user_story_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE,
  story_slug text NOT NULL,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  pages_completed int NOT NULL DEFAULT 0,
  completion_percent numeric NOT NULL DEFAULT 0 CHECK (completion_percent >= 0 AND completion_percent <= 100),
  current_page_id uuid REFERENCES public.stories_pages(id) ON DELETE SET NULL,
  current_page_index int,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, story_slug)
);

CREATE INDEX idx_user_story_progress_user ON public.user_story_progress(user_id);
CREATE INDEX idx_user_story_progress_status ON public.user_story_progress(user_id, status);

ALTER TABLE public.user_story_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own story progress" ON public.user_story_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own story progress" ON public.user_story_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own story progress" ON public.user_story_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own story progress" ON public.user_story_progress
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all story progress" ON public.user_story_progress
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_user_story_progress_updated_at
  BEFORE UPDATE ON public.user_story_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 2. user_page_progress
-- =========================================
CREATE TABLE public.user_page_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE,
  story_slug text NOT NULL,
  page_id uuid REFERENCES public.stories_pages(id) ON DELETE CASCADE,
  page_index int NOT NULL,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  started_at timestamptz,
  completed_at timestamptz,
  last_opened_at timestamptz,
  time_spent_seconds int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, story_slug, page_index)
);

CREATE INDEX idx_user_page_progress_user_story ON public.user_page_progress(user_id, story_slug);
CREATE INDEX idx_user_page_progress_page ON public.user_page_progress(page_id) WHERE page_id IS NOT NULL;

ALTER TABLE public.user_page_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own page progress" ON public.user_page_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own page progress" ON public.user_page_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own page progress" ON public.user_page_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own page progress" ON public.user_page_progress
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all page progress" ON public.user_page_progress
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_user_page_progress_updated_at
  BEFORE UPDATE ON public.user_page_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 3. user_artworks  (a pintura em si)
-- =========================================
CREATE TABLE public.user_artworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE,
  story_slug text NOT NULL,
  page_id uuid REFERENCES public.stories_pages(id) ON DELETE CASCADE,
  page_index int NOT NULL,
  title text,
  -- snapshot vetorial: { fills: { regionId: '#hex' }, ... }
  canvas_data_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  rendered_image_url text,
  thumbnail_url text,
  last_color_palette_json jsonb,
  version int NOT NULL DEFAULT 1,
  is_finished boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, story_slug, page_index)
);

CREATE INDEX idx_user_artworks_user_story ON public.user_artworks(user_id, story_slug);
CREATE INDEX idx_user_artworks_finished ON public.user_artworks(user_id, is_finished);

ALTER TABLE public.user_artworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own artworks" ON public.user_artworks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own artworks" ON public.user_artworks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own artworks" ON public.user_artworks
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own artworks" ON public.user_artworks
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all artworks" ON public.user_artworks
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_user_artworks_updated_at
  BEFORE UPDATE ON public.user_artworks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 4. achievements (catálogo) + user_achievements
-- =========================================
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  icon_url text,
  reward_type text,
  reward_value_json jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active achievements" ON public.achievements
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage achievements" ON public.achievements
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_achievements_updated_at
  BEFORE UPDATE ON public.achievements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  seen_in_ui boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own achievements" ON public.user_achievements
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all user achievements" ON public.user_achievements
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 5. user_rewards
-- =========================================
CREATE TABLE public.user_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  value_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_rewards_user ON public.user_rewards(user_id, granted_at DESC);

ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own rewards" ON public.user_rewards
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own rewards" ON public.user_rewards
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all rewards" ON public.user_rewards
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 6. user_streaks
-- =========================================
CREATE TABLE public.user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  current_streak_days int NOT NULL DEFAULT 0,
  best_streak_days int NOT NULL DEFAULT 0,
  last_activity_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own streak" ON public.user_streaks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own streak" ON public.user_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own streak" ON public.user_streaks
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all streaks" ON public.user_streaks
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_user_streaks_updated_at
  BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 7. user_favorites
-- =========================================
CREATE TABLE public.user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE,
  story_slug text,
  page_id uuid REFERENCES public.stories_pages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (story_slug IS NOT NULL OR page_id IS NOT NULL)
);

CREATE UNIQUE INDEX idx_user_favorites_unique_story
  ON public.user_favorites(user_id, story_slug)
  WHERE story_slug IS NOT NULL AND page_id IS NULL;
CREATE UNIQUE INDEX idx_user_favorites_unique_page
  ON public.user_favorites(user_id, page_id)
  WHERE page_id IS NOT NULL;
CREATE INDEX idx_user_favorites_user ON public.user_favorites(user_id);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own favorites" ON public.user_favorites
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own favorites" ON public.user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own favorites" ON public.user_favorites
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all favorites" ON public.user_favorites
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 8. user_recent_activity
-- =========================================
CREATE TABLE public.user_recent_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  reference_id uuid,
  metadata_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_recent_activity_user ON public.user_recent_activity(user_id, created_at DESC);

ALTER TABLE public.user_recent_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own activity" ON public.user_recent_activity
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own activity" ON public.user_recent_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own activity" ON public.user_recent_activity
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all activity" ON public.user_recent_activity
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 9. Storage bucket privado das pinturas renderizadas
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-artworks', 'user-artworks', false)
ON CONFLICT (id) DO NOTHING;

-- Policies: cada usuário acessa só sua própria pasta (auth.uid()/...)
CREATE POLICY "Users read own artwork files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-artworks'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users upload own artwork files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-artworks'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own artwork files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-artworks'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own artwork files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-artworks'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins read all artwork files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-artworks' AND public.has_role(auth.uid(), 'admin')
  );