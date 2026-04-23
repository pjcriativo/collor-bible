# Guia de Setup — Reino das Cores (Template PLR)

Este documento orienta a configuração completa de uma nova instância do **Reino das Cores** a partir do template PLR.

---

## Pré-requisitos

- Node.js 20+ ou [Bun](https://bun.sh) instalado
- Conta no [Supabase](https://supabase.com) (plano free é suficiente para começar)
- Plataforma de deploy compatível com Cloudflare Workers (ex.: [Cloudflare Pages](https://pages.cloudflare.com) ou similar)
- Git configurado

---

## 1. Clonar e instalar

```bash
git clone https://github.com/SEU-USUARIO/SEU-FORK.git
cd SEU-FORK
npm install        # ou: bun install
```

---

## 2. Criar projeto no Supabase

1. Acesse [app.supabase.com](https://app.supabase.com) → **New Project**
2. Escolha nome, senha do banco e região
3. Aguarde o projeto inicializar (~2 min)

### Obter as chaves

Vá em **Settings → API**:

| Variável                        | Onde encontrar                                   |
| ------------------------------- | ------------------------------------------------ |
| `VITE_SUPABASE_URL`             | Project URL                                      |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `anon` / `public` key                            |
| `SUPABASE_SERVICE_ROLE_KEY`     | `service_role` key — **nunca expor no frontend** |

---

## 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` e preencha com os dados do passo anterior:

```env
VITE_SUPABASE_URL=https://abcdefghijk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

> `.env` está no `.gitignore` — nunca será commitado.
>
> Enquanto `VITE_SUPABASE_URL` ou `VITE_SUPABASE_PUBLISHABLE_KEY` estiverem vazios, o app exibe uma tela de **"Backend não configurado"** sem crash.

---

## 4. Criar o schema do banco

### Opção A — Restaurar backup completo (recomendado)

```bash
psql -h db.SEU-PROJECT-ID.supabase.co \
     -U postgres \
     -d postgres \
     -f docs/database-backup.sql
```

> Substitua `SEU-PROJECT-ID` pelo ID do seu projeto.
> A senha é a que você definiu ao criar o projeto Supabase.

### Opção B — Rodar migrations individuais

```bash
npx supabase db push
```

> Exige a [Supabase CLI](https://supabase.com/docs/guides/cli) instalada e configurada.
> Atualize `supabase/config.toml` com o ID do seu projeto antes.

---

## 5. Criar buckets de Storage

No painel Supabase → **Storage**, crie os seguintes buckets:

| Bucket                | Visibilidade            |
| --------------------- | ----------------------- |
| `branding`            | Público                 |
| `story-covers`        | Público                 |
| `story-pages-lineart` | Público                 |
| `story-pages-preview` | Público                 |
| `story-pages-samples` | Público                 |
| `avatars`             | Público                 |
| `email-assets`        | Público                 |
| `user-artworks`       | **Privado** (RLS ativo) |

As políticas RLS dos buckets já estão incluídas no `database-backup.sql`.

---

## 6. Criar o primeiro admin

1. Abra o app e crie uma conta com seu e-mail
2. No painel Supabase → **SQL Editor**, execute:

```sql
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'seu-email@exemplo.com';
```

3. Acesse `/admin` — o painel estará disponível

---

## 7. Configurar branding

No painel admin (`/admin/branding`), configure:

- Nome do app
- Logo (upload para bucket `branding`)
- Favicon
- Cor primária
- Slogan

Ou diretamente na tabela `branding_settings` via SQL:

```sql
UPDATE branding_settings
SET app_name = 'Meu App', primary_color = '#FF6B6B'
WHERE id = 1;
```

---

## 8. Configurar idiomas

No painel admin (`/admin/idiomas`) ou via SQL:

```sql
UPDATE app_settings
SET default_language = 'pt-BR',
    enabled_languages = '["pt-BR"]';
```

Idiomas disponíveis: `pt-BR`, `en-US`, `es-ES`.

---

## 9. Configurar integração de pagamento (opcional)

O app suporta webhooks do **PerfectPay**. Para ativar:

1. No PerfectPay, configure o webhook para apontar para: `https://SEU-DOMINIO/api/perfectpay/webhook`
2. No painel admin (`/admin/integracoes`), insira a chave de assinatura HMAC fornecida pelo PerfectPay
3. Configure os planos na tabela `plans`:

```sql
INSERT INTO plans (name, price_brl, interval, is_active)
VALUES
  ('Mensal', 990, 'month', true),
  ('Anual', 4790, 'year', true);
```

---

## 10. Rodar localmente

```bash
npm run dev
# App disponível em http://localhost:5173
```

```bash
npm run build   # build de produção
npm test        # rodar testes
```

---

## 11. Deploy

### Via Cloudflare Workers

```bash
npx wrangler deploy
```

Configure as env vars com:

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

---

## 12. Personalizar histórias e categorias

As histórias e categorias disponíveis no app são definidas em `src/lib/store.ts`.

Para adicionar uma nova história:

1. Adicione a entrada em `STORIES` com slug único, título, descrição e categorias
2. Crie o gerador de páginas SVG em `src/lib/coloring-pages.ts` (veja os exemplos existentes)
3. Adicione assets de capa em `src/assets/stories/`

Para adicionar categorias, edite o array `CATEGORIES` no mesmo arquivo.

---

## 13. OG Image (preview em redes sociais)

Defina a variável:

```env
VITE_OG_IMAGE_URL=https://seu-cdn.com/og-image.png
```

Se não definida, a tag og:image não é incluída no HTML.

---

## Estrutura de pastas relevante

```
src/
├── routes/          # Páginas e endpoints API
├── components/      # Componentes UI reutilizáveis
├── hooks/           # React hooks
├── lib/             # Lógica: histórias, coloring engine, i18n, sync
├── services/        # Acesso ao Supabase (catálogo, progresso, artworks)
└── integrations/    # Cliente Supabase (auto-gerado)

supabase/
├── migrations/      # Histórico SQL
└── config.toml      # Configuração CLI Supabase

docs/
├── database-backup.sql       # Schema completo + dados + RLS (restore rápido)
├── migrations-history.sql    # Migrations concatenadas
└── README.md                 # Documentação técnica
```

---

## Checklist pós-setup

- [ ] `.env` preenchido com dados do projeto Supabase
- [ ] Schema criado (backup restaurado ou migrations rodadas)
- [ ] Buckets de storage criados
- [ ] Primeiro admin criado via SQL
- [ ] Branding configurado no painel admin
- [ ] App abre em `http://localhost:5173`
- [ ] Login e signup funcionam
- [ ] Painel `/admin` acessível
- [ ] Deploy configurado na plataforma escolhida
- [ ] Variáveis de ambiente configuradas na plataforma de deploy
