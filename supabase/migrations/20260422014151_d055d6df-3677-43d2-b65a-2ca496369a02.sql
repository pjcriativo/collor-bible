-- Adiciona configuração de e-mail remetente/contato da plataforma
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS sender_email TEXT,
  ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- Garante linha única padrão (caso ainda não exista)
INSERT INTO public.app_settings (default_language, enabled_languages)
SELECT 'pt-BR', ARRAY['pt-BR']
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

-- Permite leitura pública das configurações (para usar reply-to no envio)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'app_settings' AND policyname = 'Anyone can read app settings'
  ) THEN
    CREATE POLICY "Anyone can read app settings"
      ON public.app_settings FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- Apenas admins podem atualizar
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'app_settings' AND policyname = 'Admins can update app settings'
  ) THEN
    CREATE POLICY "Admins can update app settings"
      ON public.app_settings FOR UPDATE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;