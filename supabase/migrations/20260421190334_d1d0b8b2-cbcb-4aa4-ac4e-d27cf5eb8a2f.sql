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