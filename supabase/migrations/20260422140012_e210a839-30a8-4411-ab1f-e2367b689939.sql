-- =========================================
-- 1. story_categories
-- =========================================
CREATE TABLE public.story_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  cover_image_url text,
  icon_url text,
  emoji text,
  color text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_story_categories_active_order ON public.story_categories(is_active, sort_order);

ALTER TABLE public.story_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active story categories"
  ON public.story_categories FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage story categories"
  ON public.story_categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_story_categories_updated_at
  BEFORE UPDATE ON public.story_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 2. stories
-- =========================================
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.story_categories(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  description text,
  short_description text,
  cover_image_url text,
  thumbnail_url text,
  age_min int,
  age_max int,
  age_range text,
  testament text,
  difficulty_level int,
  estimated_minutes int,
  loved int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stories_active_order ON public.stories(is_active, sort_order);
CREATE INDEX idx_stories_category ON public.stories(category_id);
CREATE INDEX idx_stories_featured ON public.stories(is_featured) WHERE is_featured = true;

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active stories"
  ON public.stories FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage stories"
  ON public.stories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_stories_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 3. story_categories_map (N:N)
-- =========================================
CREATE TABLE public.story_categories_map (
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.story_categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, category_id)
);

CREATE INDEX idx_story_categories_map_category ON public.story_categories_map(category_id);

ALTER TABLE public.story_categories_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view story categories map"
  ON public.story_categories_map FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage story categories map"
  ON public.story_categories_map FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 4. stories_pages
-- =========================================
CREATE TABLE public.stories_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  page_number int NOT NULL,
  title text,
  image_lineart_url text,
  image_preview_url text,
  image_colored_sample_url text,
  svg_markup text,
  mobile_focus_x numeric,
  mobile_focus_y numeric,
  recommended_zoom numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, page_number)
);

CREATE INDEX idx_stories_pages_story ON public.stories_pages(story_id, page_number);

ALTER TABLE public.stories_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active story pages"
  ON public.stories_pages FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage story pages"
  ON public.stories_pages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_stories_pages_updated_at
  BEFORE UPDATE ON public.stories_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 5. branding_settings — colunas adicionais
-- =========================================
ALTER TABLE public.branding_settings
  ADD COLUMN IF NOT EXISTS primary_color text,
  ADD COLUMN IF NOT EXISTS secondary_color text,
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS support_email text;

-- =========================================
-- 6. app_settings_kv — store chave/valor genérico
-- =========================================
CREATE TABLE public.app_settings_kv (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings_kv ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view app settings kv"
  ON public.app_settings_kv FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage app settings kv"
  ON public.app_settings_kv FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_app_settings_kv_updated_at
  BEFORE UPDATE ON public.app_settings_kv
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed de chaves padrão (não sobrescreve se já existir)
INSERT INTO public.app_settings_kv (key, value_json, description) VALUES
  ('mobile_app_mode', 'false'::jsonb, 'Ativa comportamentos exclusivos do app mobile'),
  ('default_language', '"pt-BR"'::jsonb, 'Idioma padrão da aplicação'),
  ('allow_guest_preview', 'false'::jsonb, 'Permite preview sem login'),
  ('gamification_enabled', 'true'::jsonb, 'Liga sistema de conquistas e recompensas'),
  ('daily_reward_enabled', 'true'::jsonb, 'Recompensas diárias por uso'),
  ('max_recent_colors', '12'::jsonb, 'Quantidade de cores recentes lembradas'),
  ('canvas_autosave_interval_ms', '5000'::jsonb, 'Intervalo de autosave do canvas em ms')
ON CONFLICT (key) DO NOTHING;

-- =========================================
-- 7. Storage buckets faltantes
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('story-pages-lineart', 'story-pages-lineart', true),
  ('story-pages-preview', 'story-pages-preview', true),
  ('story-pages-samples', 'story-pages-samples', true),
  ('avatars', 'avatars', true),
  ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policies — leitura pública
CREATE POLICY "Public read story-pages-lineart"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'story-pages-lineart');

CREATE POLICY "Public read story-pages-preview"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'story-pages-preview');

CREATE POLICY "Public read story-pages-samples"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'story-pages-samples');

CREATE POLICY "Public read email-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'email-assets');

-- Avatars: leitura pública, escrita só pelo dono (pasta = auth.uid())
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admin: gestão completa nos buckets de conteúdo/marketing
CREATE POLICY "Admins manage story-pages-lineart"
  ON storage.objects FOR ALL
  USING (bucket_id = 'story-pages-lineart' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'story-pages-lineart' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage story-pages-preview"
  ON storage.objects FOR ALL
  USING (bucket_id = 'story-pages-preview' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'story-pages-preview' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage story-pages-samples"
  ON storage.objects FOR ALL
  USING (bucket_id = 'story-pages-samples' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'story-pages-samples' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage email-assets"
  ON storage.objects FOR ALL
  USING (bucket_id = 'email-assets' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'email-assets' AND public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 8. SEED do catálogo atual
-- =========================================
INSERT INTO public.story_categories (slug, title, emoji, color, sort_order) VALUES
  ('criacao', 'Criação', '🌍', 'mint', 1),
  ('herois', 'Heróis da Bíblia', '🛡️', 'gold', 2),
  ('milagres', 'Milagres de Jesus', '✨', 'sky', 3),
  ('parabolas', 'Parábolas', '📖', 'coral', 4),
  ('animais', 'Animais da Bíblia', '🦁', 'mint', 5),
  ('antigo', 'Antigo Testamento', '📜', 'deep', 6),
  ('novo', 'Novo Testamento', '🕊️', 'sky', 7),
  ('amadas', 'Mais amadas', '❤️', 'coral', 8)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.stories (slug, title, subtitle, short_description, age_range, testament, sort_order, is_featured, is_new, is_active, loved) VALUES
  ('noe-e-a-arca', 'Arca de Noé', 'Animais, chuva e um lindo arco-íris', 'Animais, chuva e um lindo arco-íris', '3-8 anos', 'antigo', 1, true, false, true, 98),
  ('davi-e-golias', 'Davi e Golias', 'Coragem que vem do coração', 'Coragem que vem do coração', '4-10 anos', 'antigo', 2, false, true, true, 88),
  ('jonas-e-a-baleia', 'Jonas e a Baleia', 'Uma aventura no fundo do mar', 'Uma aventura no fundo do mar', '3-9 anos', 'antigo', 3, false, true, true, 95),
  ('moises-e-o-mar-vermelho', 'Moisés e o Mar Vermelho', 'O caminho que se abriu pela fé', 'O caminho que se abriu pela fé', '4-10 anos', 'antigo', 4, false, false, true, 80),
  ('daniel-na-cova-dos-leoes', 'Daniel na Cova dos Leões', 'Fé que protege', 'Fé que protege', '4-10 anos', 'antigo', 5, false, false, true, 91),
  ('o-nascimento-de-jesus', 'O Nascimento de Jesus', 'A noite mais linda de todas', 'A noite mais linda de todas', '3-10 anos', 'novo', 6, false, false, true, 99),
  ('jesus-e-as-criancas', 'Jesus e as Crianças', 'Vinde a mim, pequeninos', 'Vinde a mim, pequeninos', '2-8 anos', 'novo', 7, false, true, true, 96),
  ('a-multiplicacao-dos-paes', 'A Multiplicação dos Pães', 'Pão e peixes para todos', 'Pão e peixes para todos', '4-10 anos', 'novo', 8, false, false, true, 85),
  ('o-bom-samaritano', 'O Bom Samaritano', 'Ajudar com o coração', 'Ajudar com o coração', '4-10 anos', 'novo', 9, false, false, true, 82),
  ('a-criacao-do-mundo', 'A Criação do Mundo', 'Em sete dias, tudo ficou lindo', 'Em sete dias, tudo ficou lindo', '3-10 anos', 'antigo', 10, false, false, true, 90),
  ('jesus-acalma-a-tempestade', 'Jesus Acalma a Tempestade', 'Paz no meio do vento', 'Paz no meio do vento', '4-10 anos', 'novo', 11, false, false, true, 87),
  ('ester-rainha-corajosa', 'Ester, Rainha Corajosa', 'Coragem para fazer o bem', 'Coragem para fazer o bem', '5-12 anos', 'antigo', 12, false, false, true, 84),
  ('o-filho-prodigo', 'O Filho Pródigo', 'O abraço do perdão', 'O abraço do perdão', '4-10 anos', 'novo', 13, false, false, true, 89),
  ('a-ovelha-perdida', 'A Ovelha Perdida', 'O pastor que procura', 'O pastor que procura', '3-9 anos', 'novo', 14, false, false, true, 86),
  ('o-semeador', 'O Semeador', 'Sementes no coração', 'Sementes no coração', '4-10 anos', 'novo', 15, false, false, true, 78),
  ('a-casa-na-rocha', 'A Casa na Rocha', 'Firmes na Palavra', 'Firmes na Palavra', '4-10 anos', 'novo', 16, false, false, true, 81)
ON CONFLICT (slug) DO NOTHING;

-- Mapeamento N:N (story_slug × category_slug)
WITH mapping(story_slug, category_slug) AS (VALUES
  ('noe-e-a-arca', 'herois'),
  ('noe-e-a-arca', 'animais'),
  ('noe-e-a-arca', 'antigo'),
  ('noe-e-a-arca', 'amadas'),
  ('davi-e-golias', 'herois'),
  ('davi-e-golias', 'antigo'),
  ('jonas-e-a-baleia', 'animais'),
  ('jonas-e-a-baleia', 'antigo'),
  ('jonas-e-a-baleia', 'amadas'),
  ('moises-e-o-mar-vermelho', 'herois'),
  ('moises-e-o-mar-vermelho', 'antigo'),
  ('daniel-na-cova-dos-leoes', 'herois'),
  ('daniel-na-cova-dos-leoes', 'animais'),
  ('daniel-na-cova-dos-leoes', 'antigo'),
  ('o-nascimento-de-jesus', 'novo'),
  ('o-nascimento-de-jesus', 'amadas'),
  ('jesus-e-as-criancas', 'novo'),
  ('jesus-e-as-criancas', 'amadas'),
  ('a-multiplicacao-dos-paes', 'milagres'),
  ('a-multiplicacao-dos-paes', 'novo'),
  ('o-bom-samaritano', 'parabolas'),
  ('o-bom-samaritano', 'novo'),
  ('a-criacao-do-mundo', 'criacao'),
  ('a-criacao-do-mundo', 'animais'),
  ('a-criacao-do-mundo', 'antigo'),
  ('a-criacao-do-mundo', 'amadas'),
  ('jesus-acalma-a-tempestade', 'milagres'),
  ('jesus-acalma-a-tempestade', 'novo'),
  ('jesus-acalma-a-tempestade', 'amadas'),
  ('ester-rainha-corajosa', 'herois'),
  ('ester-rainha-corajosa', 'amadas'),
  ('o-filho-prodigo', 'parabolas'),
  ('o-filho-prodigo', 'novo'),
  ('o-filho-prodigo', 'amadas'),
  ('a-ovelha-perdida', 'parabolas'),
  ('a-ovelha-perdida', 'animais'),
  ('a-ovelha-perdida', 'novo'),
  ('a-ovelha-perdida', 'amadas'),
  ('o-semeador', 'parabolas'),
  ('o-semeador', 'novo'),
  ('a-casa-na-rocha', 'parabolas'),
  ('a-casa-na-rocha', 'novo')
)
INSERT INTO public.story_categories_map (story_id, category_id)
SELECT s.id, c.id
FROM mapping m
JOIN public.stories s ON s.slug = m.story_slug
JOIN public.story_categories c ON c.slug = m.category_slug
ON CONFLICT DO NOTHING;