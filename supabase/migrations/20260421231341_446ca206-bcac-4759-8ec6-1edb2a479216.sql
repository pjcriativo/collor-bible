-- =========================================
-- 1. BRANDING SETTINGS (singleton)
-- =========================================
CREATE TABLE public.branding_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text,
  logo_alt text DEFAULT 'Logo',
  app_name text DEFAULT 'Reino das Cores',
  favicon_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view branding"
  ON public.branding_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage branding"
  ON public.branding_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_branding_settings_updated_at
  BEFORE UPDATE ON public.branding_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Linha singleton inicial
INSERT INTO public.branding_settings (app_name) VALUES ('Reino das Cores');

-- =========================================
-- 2. EMAIL TEMPLATES
-- =========================================
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view email templates"
  ON public.email_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage email templates"
  ON public.email_templates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Templates iniciais
INSERT INTO public.email_templates (template_key, name, subject, body_html, variables) VALUES
('access_email', 'E-mail de acesso à conta',
 'Bem-vindo ao Reino das Cores! Seu acesso está liberado',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0E1726;color:#fff;border-radius:16px;">
  <h1 style="color:#F4BE63;margin:0 0 16px;">Olá, {{name}}!</h1>
  <p>Seu acesso ao <strong>Reino das Cores</strong> foi liberado com sucesso.</p>
  <p>Use o botão abaixo para entrar:</p>
  <p style="text-align:center;margin:32px 0;">
    <a href="{{login_url}}" style="background:#F4BE63;color:#0E1726;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:bold;">Acessar minha conta</a>
  </p>
  <p style="font-size:12px;color:#9CA3AF;">Se o botão não funcionar, copie e cole este link no navegador: {{login_url}}</p>
</div>',
 '["name","login_url","email"]'::jsonb),
('password_recovery', 'Recuperação de senha',
 'Redefina sua senha do Reino das Cores',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0E1726;color:#fff;border-radius:16px;">
  <h1 style="color:#F4BE63;margin:0 0 16px;">Recuperação de senha</h1>
  <p>Olá, {{name}}!</p>
  <p>Recebemos um pedido para redefinir a sua senha. Clique no botão abaixo para criar uma nova:</p>
  <p style="text-align:center;margin:32px 0;">
    <a href="{{reset_url}}" style="background:#F4BE63;color:#0E1726;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:bold;">Redefinir senha</a>
  </p>
  <p style="font-size:12px;color:#9CA3AF;">Se você não solicitou essa redefinição, pode ignorar este e-mail. Seu acesso continua seguro.</p>
</div>',
 '["name","reset_url","email"]'::jsonb);

-- =========================================
-- 3. ACTIVE SESSIONS (single-session per user)
-- =========================================
CREATE TABLE public.active_sessions (
  user_id uuid PRIMARY KEY,
  session_token text NOT NULL,
  device_label text,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own active session"
  ON public.active_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own active session"
  ON public.active_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own active session"
  ON public.active_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own active session"
  ON public.active_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all active sessions"
  ON public.active_sessions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_active_sessions_updated_at
  BEFORE UPDATE ON public.active_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime para active_sessions (para detectar sessão revogada)
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;
ALTER TABLE public.active_sessions REPLICA IDENTITY FULL;

-- =========================================
-- 4. STORAGE BUCKET para logo
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view branding files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'branding');

CREATE POLICY "Admins can upload branding files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update branding files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete branding files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));