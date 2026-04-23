-- ==============================================================
-- ALL MIGRATIONS (chronological) - Reino das Cores
-- Generated: 2026-04-23T14:28:19Z
-- ==============================================================


-- ==============================================================
-- MIGRATION: 20260420235600_06f61013-e169-4db8-90af-a6e15d558ffe.sql
-- ==============================================================
create table if not exists public.profiles (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  purchase_email text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can create their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
before update on public.profiles
for each row
execute function public.update_updated_at_column();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, purchase_email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Minha criança'),
    new.email
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

-- ==============================================================
-- MIGRATION: 20260421005820_9738258d-44b2-4f18-90da-01cd8fcb04a4.sql
-- ==============================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can create roles" ON public.user_roles;
CREATE POLICY "Admins can create roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- ==============================================================
-- MIGRATION: 20260421034429_9012e669-f993-4b49-bed2-8a2f62505a3f.sql
-- ==============================================================
CREATE TABLE public.user_notification_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  story_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, story_id)
);

ALTER TABLE public.user_notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification reads"
ON public.user_notification_reads
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notification reads"
ON public.user_notification_reads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification reads"
ON public.user_notification_reads
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification reads"
ON public.user_notification_reads
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_user_notification_reads_user_id
ON public.user_notification_reads (user_id);

CREATE TRIGGER update_user_notification_reads_updated_at
BEFORE UPDATE ON public.user_notification_reads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================================
-- MIGRATION: 20260421034958_59d6340c-d428-4157-a91e-2e21b974414a.sql
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  native_language TEXT NOT NULL DEFAULT 'pt-BR',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  customer_email TEXT,
  external_customer_id TEXT,
  external_subscription_id TEXT UNIQUE,
  provider TEXT NOT NULL DEFAULT 'perfectpay',
  status TEXT NOT NULL DEFAULT 'pending',
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  started_at TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  customer_email TEXT,
  external_sale_id TEXT UNIQUE,
  external_customer_id TEXT,
  provider TEXT NOT NULL DEFAULT 'perfectpay',
  event_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  sold_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'perfectpay',
  endpoint_url TEXT NOT NULL,
  signing_secret TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  last_received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'perfectpay',
  event_type TEXT,
  external_event_id TEXT,
  processed BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  default_language TEXT NOT NULL DEFAULT 'pt-BR',
  enabled_languages TEXT[] NOT NULL DEFAULT ARRAY['pt-BR','en-US','es-ES'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage plans" ON public.plans FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage sales" ON public.sales FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own sales" ON public.sales FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage webhook integrations" ON public.webhook_integrations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view webhook events" ON public.webhook_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage app settings" ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can view app settings" ON public.app_settings FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON public.sales (sold_at);
CREATE INDEX IF NOT EXISTS idx_sales_plan_id ON public.sales (plan_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON public.webhook_events (provider, received_at DESC);

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_webhook_integrations_updated_at BEFORE UPDATE ON public.webhook_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.plans (code, name, description, price_cents, billing_interval, native_language)
VALUES
  ('mensal', 'Plano Mensal', 'Acesso mensal ao app de colorir cristão.', 2990, 'monthly', 'pt-BR'),
  ('anual', 'Plano Anual', 'Acesso anual com melhor recorrência.', 29900, 'yearly', 'pt-BR')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.app_settings (default_language, enabled_languages)
SELECT 'pt-BR', ARRAY['pt-BR','en-US','es-ES']
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

-- ==============================================================
-- MIGRATION: 20260421035835_07bf48ad-4b60-4554-a453-9a41c3a55f69.sql
-- ==============================================================
CREATE POLICY "Anyone can view app settings"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- ==============================================================
-- MIGRATION: 20260421060433_d6b1dc18-19b8-4f25-a9b1-4728becc7ad0.sql
-- ==============================================================
CREATE TABLE public.story_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  story_slug TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  overall_progress_percent INTEGER NOT NULL DEFAULT 0,
  unlocked_milestone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, story_slug)
);

ALTER TABLE public.story_completions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_story_completions_user_id ON public.story_completions(user_id);
CREATE INDEX idx_story_completions_story_slug ON public.story_completions(story_slug);

CREATE POLICY "Users can view their own story completions"
ON public.story_completions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own story completions"
ON public.story_completions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all story completions"
ON public.story_completions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_story_completions_updated_at
BEFORE UPDATE ON public.story_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================================
-- MIGRATION: 20260421190334_d1d0b8b2-cbcb-4aa4-ac4e-d27cf5eb8a2f.sql
-- ==============================================================
-- Adiciona coluna `child_name` ao perfil do usuário.
-- Opcional, curta (até 60 chars para acomodar nomes compostos com folga),
-- texto simples — saneada e validada também na aplicação (zod) antes de
-- persistir. Não é PII sensível por si só, mas é dado de criança: as
-- políticas RLS já existentes em `profiles` (Users can view/update their
-- own profile) garantem que apenas o próprio usuário vê e edita.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS child_name text;

-- Garantia de tamanho no DB (defesa em profundidade — a aplicação já
-- limita em 60). NULL é permitido (campo opcional).
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_child_name_length
  CHECK (child_name IS NULL OR char_length(child_name) <= 60);

-- Trigger de updated_at: a função `update_updated_at_column` já existe;
-- garante que `updated_at` reflita a alteração quando o nome muda.
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================================
-- MIGRATION: 20260421203831_76e8b9af-4142-4e08-a9de-f837d44d7f03.sql
-- ==============================================================
UPDATE public.app_settings SET default_language = 'pt-BR', updated_at = now() WHERE default_language <> 'pt-BR';

-- ==============================================================
-- MIGRATION: 20260421231341_446ca206-bcac-4759-8ec6-1edb2a479216.sql
-- ==============================================================
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

-- ==============================================================
-- MIGRATION: 20260421231358_c205f4c7-5852-41fa-a9b2-195d990a3c49.sql
-- ==============================================================
-- Restringir LISTING do bucket: apenas admins podem listar.
-- O acesso direto por URL continua público porque o bucket é public=true.
DROP POLICY IF EXISTS "Public can view branding files" ON storage.objects;

CREATE POLICY "Admins can list branding files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));

-- ==============================================================
-- MIGRATION: 20260422012718_e4376b4e-437d-4a7b-8c3a-671f4c98677d.sql
-- ==============================================================
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

-- ==============================================================
-- MIGRATION: 20260422014151_d055d6df-3677-43d2-b65a-2ca496369a02.sql
-- ==============================================================
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

-- ==============================================================
-- MIGRATION: 20260422140012_e210a839-30a8-4411-ab1f-e2367b689939.sql
-- ==============================================================
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

-- ==============================================================
-- MIGRATION: 20260422140046_6149df33-a849-4701-82f1-7c5afe505012.sql
-- ==============================================================
-- Substitui as policies amplas por policies que permitem GET por path (download)
-- mas evitam listagem de objetos. A diferença prática é que apenas operações
-- com nome conhecido funcionam — coerente com como o app já consome os outros buckets.
DROP POLICY IF EXISTS "Public read story-pages-lineart" ON storage.objects;
DROP POLICY IF EXISTS "Public read story-pages-preview" ON storage.objects;
DROP POLICY IF EXISTS "Public read story-pages-samples" ON storage.objects;
DROP POLICY IF EXISTS "Public read email-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;

-- Recria como policies estritas: leitura permitida apenas quando o caminho
-- (name) é informado pelo cliente (download direto). Listagem via list() do
-- SDK continuará retornando vazio para anônimos.
CREATE POLICY "Public download story-pages-lineart"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'story-pages-lineart' AND name IS NOT NULL AND length(name) > 0);

CREATE POLICY "Public download story-pages-preview"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'story-pages-preview' AND name IS NOT NULL AND length(name) > 0);

CREATE POLICY "Public download story-pages-samples"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'story-pages-samples' AND name IS NOT NULL AND length(name) > 0);

CREATE POLICY "Public download email-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'email-assets' AND name IS NOT NULL AND length(name) > 0);

CREATE POLICY "Public download avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND name IS NOT NULL AND length(name) > 0);

-- ==============================================================
-- MIGRATION: 20260422140553_1adf6ab1-ebcc-4863-9df4-86648d35b3ba.sql
-- ==============================================================
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

-- ==============================================================
-- MIGRATION: 20260422143134_a8bb6d1b-fd04-4bc9-b4c6-e3c07aba6729.sql
-- ==============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_favorites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_story_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_page_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_artworks;

ALTER TABLE public.user_favorites REPLICA IDENTITY FULL;
ALTER TABLE public.user_story_progress REPLICA IDENTITY FULL;
ALTER TABLE public.user_page_progress REPLICA IDENTITY FULL;
ALTER TABLE public.user_artworks REPLICA IDENTITY FULL;
