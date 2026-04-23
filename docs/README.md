# Reino das Cores 🎨

**Aplicativo bíblico de colorir para crianças**, com histórias narradas, sistema de progresso, conquistas e modo PWA instalável.

URL de produção: _(configurar após deploy — veja `SETUP.md`)_

---

## 📖 Sobre o projeto

O **Reino das Cores** (publicado como _Biblin Coloring Joy_) é uma plataforma interativa onde crianças exploram histórias da Bíblia colorindo páginas digitais. O app combina:

- 🎨 **Páginas de colorir** com tinta digital (canvas + segmentação PNG por região)
- 📖 **Histórias bíblicas narradas** (Davi, Jonas, Noé, Daniel, Ester, Moisés, Jesus, etc.)
- 🏆 **Conquistas, streaks diárias e progresso** salvos por usuário
- 👶 **Personalização pelo nome da criança** em todas as telas
- 🌍 **Internacionalização** (pt-BR, en-US, es-ES)
- 📱 **PWA instalável** com tutorial específico para iOS / Android / Desktop
- 💳 **Integração de pagamento** via PerfectPay (webhook)
- 🛠️ **Painel admin** completo: usuários, histórias, categorias, banners, branding, e-mails, integrações, relatórios

---

## 🧱 Stack técnica

| Camada          | Tecnologia                                                      |
| --------------- | --------------------------------------------------------------- |
| Framework       | **TanStack Start v1** (React 19 + SSR)                          |
| Build           | **Vite 7**                                                      |
| Roteamento      | TanStack Router (file-based em `src/routes/`)                   |
| Estilo          | **Tailwind CSS v4** + design tokens em `src/styles.css` (oklch) |
| UI              | **shadcn/ui** + Radix                                           |
| Estado servidor | TanStack Query                                                  |
| Backend         | **Supabase** (Postgres + Auth + Storage + Edge Functions)       |
| Runtime SSR     | Cloudflare Workers (`wrangler.jsonc`)                           |
| Testes          | **Vitest** + Testing Library                                    |
| Linguagens      | TypeScript estrito                                              |

---

## 🗂️ Estrutura de pastas

```
.
├── src/
│   ├── routes/              # Rotas (file-based) — páginas públicas, admin e endpoints /api
│   ├── components/          # UI reutilizável (incluindo /ui shadcn e /coloring)
│   ├── hooks/               # React hooks (use-*.ts)
│   ├── lib/                 # Lógica pura: i18n, coloring engine, color matching, sync, store
│   ├── services/            # Camada de acesso a dados (Supabase)
│   ├── integrations/supabase # Cliente Supabase (auto-gerado, NÃO editar)
│   ├── styles.css           # Design tokens + Tailwind v4
│   ├── router.tsx           # Configuração do router
│   └── routeTree.gen.ts     # Gerado automaticamente
├── supabase/
│   ├── migrations/          # Histórico SQL das migrations
│   └── config.toml
├── docs/                    # ⬅️ Você está aqui
│   ├── README.md
│   ├── database-backup.sql  # Backup completo (schema + dados + RLS)
│   └── migrations-history.sql
├── public/
├── vite.config.ts
└── package.json
```

---

## 🚀 Como rodar localmente

```bash
# 1. Instalar dependências
bun install        # ou: npm install

# 2. Subir em modo dev
bun dev            # http://localhost:5173

# 3. Rodar testes
bun test           # ou: npx vitest

# 4. Build de produção
bun run build
```

> ℹ️ Copie `.env.example` para `.env` e preencha com os dados do seu projeto Supabase. Veja instruções completas em `SETUP.md`.

---

## 🔐 Autenticação e papéis

- Login via e-mail/senha (Supabase Auth).
- Papéis (`admin`, `moderator`, `user`) ficam na tabela dedicada **`user_roles`** — nunca em `profiles` (evita escalada de privilégio).
- Verificação de admin sempre via função `public.has_role(auth.uid(), 'admin')` (SECURITY DEFINER).
- Rotas administrativas: `src/routes/admin.*.tsx` (protegidas em `admin.tsx`).

### Primeiro admin

Após criar sua conta no app, insira manualmente na tabela `user_roles` do Supabase:

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('<seu-user-id>', 'admin');
```

---

## 🗄️ Banco de dados

O esquema completo está versionado em `supabase/migrations/` e consolidado nos dois arquivos abaixo:

| Arquivo                                              | Conteúdo                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| [`database-backup.sql`](./database-backup.sql)       | **Backup completo** — schema + RLS + dados de catálogo (pronto para `psql -f`) |
| [`migrations-history.sql`](./migrations-history.sql) | Todas as migrations concatenadas em ordem cronológica                          |

### Principais tabelas

| Tabela                                                                    | Função                             |
| ------------------------------------------------------------------------- | ---------------------------------- |
| `profiles`                                                                | Dados do usuário + nome da criança |
| `user_roles`                                                              | Papéis (admin/moderator/user)      |
| `stories`, `stories_pages`, `story_categories`, `story_categories_map`    | Catálogo de histórias e páginas    |
| `story_cover_overrides`                                                   | Sobrescrita de capas               |
| `user_artworks`                                                           | Pinturas salvas (canvas JSON)      |
| `user_page_progress`, `user_story_progress`, `story_completions`          | Progresso por página/história      |
| `user_favorites`                                                          | Favoritos                          |
| `user_streaks`, `achievements`, `user_achievements`, `user_rewards`       | Gamificação                        |
| `user_recent_activity`                                                    | Histórico recente                  |
| `user_notification_reads`                                                 | Notificações lidas                 |
| `active_sessions`                                                         | Sessão única ativa por usuário     |
| `plans`, `subscriptions`, `sales`                                         | Pagamentos PerfectPay              |
| `webhook_integrations`, `webhook_events`                                  | Recebimento de webhooks            |
| `branding_settings`, `app_settings`, `app_settings_kv`, `email_templates` | Configurações administrativas      |

### Buckets de Storage

`branding`, `story-covers`, `story-pages-lineart`, `story-pages-preview`, `story-pages-samples`, `avatars`, `email-assets`, `user-artworks` _(privado)_.

### RLS (Row Level Security)

Todas as tabelas têm RLS habilitado. Padrões:

- Usuários veem/editam apenas suas próprias linhas (`auth.uid() = user_id`).
- Admins têm acesso total via `has_role(auth.uid(), 'admin')`.
- Tabelas públicas de catálogo (`stories`, `story_categories`) são legíveis por todos quando `is_active = true`.

---

## 🛣️ Rotas principais

### Públicas

| Rota                                | Descrição                                  |
| ----------------------------------- | ------------------------------------------ |
| `/`                                 | Splash / boas-vindas                       |
| `/home`                             | Home com banners + carrosséis de histórias |
| `/categorias` · `/categorias/$slug` | Catálogo por categoria                     |
| `/historia/$slug`                   | Detalhe da história                        |
| `/colorir/$slug`                    | Canvas de colorir                          |
| `/buscar`                           | Busca                                      |
| `/favoritos`                        | Favoritos do usuário                       |
| `/perfil`                           | Perfil + nome da criança                   |
| `/reset-password`                   | Reset de senha                             |

### Admin (`/admin/*`)

`index`, `usuarios`, `historias`, `categorias`, `banners`, `branding`, `idiomas`, `emails`, `integracoes`, `relatorios`, `qa-capas`.

### API

| Endpoint                  | Função                               |
| ------------------------- | ------------------------------------ |
| `/api/profile`            | CRUD do perfil do usuário logado     |
| `/api/admin/users`        | Listagem/admin de usuários           |
| `/api/admin/metrics`      | Métricas do dashboard                |
| `/api/admin/reports`      | Relatórios (respeita filtro de data) |
| `/api/perfectpay/webhook` | Webhook de pagamentos PerfectPay     |

---

## 🎨 Design system

- **Sempre** use tokens semânticos (`bg-primary`, `text-foreground`, `bg-muted`, etc.) — nunca cores cruas.
- Tokens definidos em `src/styles.css` em **oklch**.
- Variantes de componentes via `cva` (ver `src/components/ui/button.tsx`).
- Suporte a tema claro/escuro garantido por design.

---

## 🌍 Internacionalização

Sistema próprio em `src/lib/i18n.ts` com fila, cancelamento e fallback. Idiomas habilitados via `app_settings.enabled_languages`. Default em `app_settings.default_language` (pt-BR).

---

## 🧪 Testes

Cobertura significativa em:

- Engine de coloring (`coloring-progress.*.test.ts`, `use-coloring-state.*.test.ts`)
- i18n (`i18n.*.test.ts`)
- Personalização de nome (`personalize.*.test.ts`)
- Fluxos de auth (`auth-login*.test.ts`)
- Sincronização realtime (`use-child-name.realtime.test.tsx`)
- Navegação (`historia.back-navigation.*.test.tsx`)

```bash
bun test                              # roda tudo
bun test src/lib/coloring-progress    # filtra por path
```

---

## 💳 Integração de pagamento

PerfectPay envia webhooks para `/api/perfectpay/webhook`. O endpoint:

1. Verifica assinatura HMAC (segredo em `webhook_integrations.signing_secret`).
2. Persiste o evento em `webhook_events`.
3. Cria/atualiza `subscriptions` e `sales` conforme o `event_type`.
4. Vincula ao `user_id` quando o e-mail bate com `auth.users.email`.

Configurar planos e preços diretamente na tabela `plans` do Supabase.

---

## 🚢 Deploy

Deploy em qualquer plataforma compatível com Cloudflare Workers.

- Configure as variáveis de ambiente na plataforma escolhida (ver `.env.example`)
- Migrations são executadas via `supabase db push` ou restaurando `docs/database-backup.sql`
- Veja instruções completas em `SETUP.md`

Veja instruções detalhadas em `SETUP.md`.

---

## 📜 Licença

Projeto proprietário. Todos os direitos reservados.
