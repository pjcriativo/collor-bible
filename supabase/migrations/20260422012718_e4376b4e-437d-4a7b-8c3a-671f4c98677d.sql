-- Tabela para armazenar overrides de capas de histórias gerenciados pelo admin
CREATE TABLE IF NOT EXISTS public.story_cover_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_slug TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'upload',
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.story_cover_overrides ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa (anon/authenticated) pode visualizar os overrides para
-- conseguir renderizar as capas atualizadas no app público.
CREATE POLICY "Anyone can view story cover overrides"
ON public.story_cover_overrides
FOR SELECT
TO anon, authenticated
USING (true);

-- Apenas admins podem criar/atualizar/remover overrides.
CREATE POLICY "Admins can manage story cover overrides"
ON public.story_cover_overrides
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger para manter updated_at em sincronia.
CREATE TRIGGER update_story_cover_overrides_updated_at
BEFORE UPDATE ON public.story_cover_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket público para armazenar as capas importadas pelo admin.
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-covers', 'story-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Acesso de leitura pública (capas aparecem no app sem login).
CREATE POLICY "Story covers are publicly accessible"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'story-covers');

-- Apenas admins podem enviar / atualizar / apagar capas.
CREATE POLICY "Admins can upload story covers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'story-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update story covers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'story-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete story covers"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'story-covers' AND public.has_role(auth.uid(), 'admin'));