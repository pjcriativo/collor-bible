import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const json = (body: unknown, status = 200) => Response.json(body, { status });

function getClients(authHeader: string | null) {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) throw new Error("Backend não configurado");
  return {
    userClient: createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader ?? "" } },
    }),
    adminClient: createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

async function requireAdmin(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) throw json({ error: "Não autorizado: header ausente" }, 401);
  const { userClient, adminClient } = getClients(authHeader);
  const { data: userData, error } = await userClient.auth.getUser();
  const user = userData.user;
  if (error || !user)
    throw json({ error: `Não autorizado: ${error?.message ?? "sessão inválida"}` }, 401);
  const { data: roles } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");
  if (!roles?.length) throw json({ error: "Acesso negado: usuário não é admin" }, 403);
  return adminClient;
}

export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const admin = await requireAdmin(request);
          const url = new URL(request.url);
          const search = url.searchParams.get("search")?.trim().toLowerCase() ?? "";
          const status = url.searchParams.get("status") ?? "all";
          let profilesQuery = admin
            .from("profiles")
            .select("id,user_id,display_name,child_name,purchase_email,created_at")
            .order("created_at", { ascending: false })
            .limit(500);
          if (search) {
            const escaped = search.replace(/[%,()]/g, " ").trim();
            profilesQuery = profilesQuery.or(
              `display_name.ilike.%${escaped}%,child_name.ilike.%${escaped}%,purchase_email.ilike.%${escaped}%`,
            );
          }
          const { data: profiles } = await profilesQuery;
          const { data: authUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const { data: plans } = await admin
            .from("plans")
            .select("id,name,code,price_cents,currency,billing_interval,active")
            .eq("active", true)
            .order("price_cents", { ascending: true });
          const userIds = (profiles ?? []).map((profile: any) => profile.user_id).filter(Boolean);
          const emails = (profiles ?? [])
            .map((profile: any) => profile.purchase_email)
            .filter(Boolean);
          const { data: subscriptions } = userIds.length
            ? await admin
                .from("subscriptions")
                .select(
                  "id,user_id,customer_email,status,current_period_end,started_at,plans(name)",
                )
                .in("user_id", userIds)
            : { data: [] };
          const { data: salesByUser } = userIds.length
            ? await admin
                .from("sales")
                .select(
                  "id,user_id,customer_email,status,amount_cents,currency,sold_at,plans(name)",
                )
                .in("user_id", userIds)
                .order("sold_at", { ascending: false })
                .limit(500)
            : { data: [] };
          const { data: salesByEmail } = emails.length
            ? await admin
                .from("sales")
                .select(
                  "id,user_id,customer_email,status,amount_cents,currency,sold_at,plans(name)",
                )
                .in("customer_email", emails)
                .order("sold_at", { ascending: false })
                .limit(500)
            : { data: [] };
          const sales = [...(salesByUser ?? []), ...(salesByEmail ?? [])].filter(
            (sale: any, index, arr) => arr.findIndex((item: any) => item.id === sale.id) === index,
          );
          const users = (profiles ?? [])
            .map((profile: any) => {
              const sub = (subscriptions ?? []).find(
                (item: any) =>
                  item.user_id === profile.user_id ||
                  item.customer_email === profile.purchase_email,
              );
              const payments = sales
                .filter(
                  (sale: any) =>
                    sale.user_id === profile.user_id ||
                    sale.customer_email === profile.purchase_email,
                )
                .slice(0, 12);
              const subscriptionStatus = sub?.status ?? "no_subscription";
              const authUser = authUsers.users.find((item) => item.id === profile.user_id);
              const bannedUntil = authUser?.banned_until
                ? new Date(authUser.banned_until).getTime()
                : 0;
              return {
                ...profile,
                accessEnabled: !bannedUntil || bannedUntil <= Date.now(),
                subscriptionStatus,
                subscriptionPlan: Array.isArray((sub as any)?.plans)
                  ? ((sub as any).plans[0]?.name ?? null)
                  : ((sub as any)?.plans?.name ?? null),
                nextBilling: sub?.current_period_end ?? null,
                payments,
                totalPaidCents: payments
                  .filter((p: any) =>
                    ["paid", "approved", "completed"].includes(String(p.status).toLowerCase()),
                  )
                  .reduce((sum: number, p: any) => sum + Number(p.amount_cents ?? 0), 0),
              };
            })
            .filter((user: any) => {
              const matchesSearch =
                !search ||
                [user.display_name, user.child_name, user.purchase_email, user.user_id].some(
                  (value) =>
                    String(value ?? "")
                      .toLowerCase()
                      .includes(search),
                );
              const matchesStatus = status === "all" || user.subscriptionStatus === status;
              return matchesSearch && matchesStatus;
            });
          return json({ users, plans: plans ?? [] });
        } catch (error) {
          if (error instanceof Response) return error;
          return json({ error: "Não foi possível carregar usuários" }, 500);
        }
      },
      POST: async ({ request }) => {
        try {
          const admin = await requireAdmin(request);
          const body = (await request.json()) as {
            action?: string;
            email?: string;
            password?: string;
            displayName?: string;
            userId?: string;
            enabled?: boolean;
            planId?: string;
          };
          if (body.action === "create") {
            if (!body.email || !body.password)
              return json({ error: "Email e senha são obrigatórios" }, 400);
            const displayName = body.displayName?.trim() || "Minha criança";
            const { data, error } = await admin.auth.admin.createUser({
              email: body.email,
              password: body.password,
              email_confirm: true,
              user_metadata: { display_name: displayName },
            });
            if (error) return json({ error: error.message }, 400);
            const newUserId = data.user?.id;
            if (newUserId) {
              await admin
                .from("profiles")
                .upsert(
                  { user_id: newUserId, display_name: displayName, purchase_email: body.email },
                  { onConflict: "user_id" },
                );
            }
            return json({ user: data.user });
          }
          if (body.action === "password") {
            if (!body.userId || !body.password)
              return json({ error: "Usuário e nova senha são obrigatórios" }, 400);
            const { data, error } = await admin.auth.admin.updateUserById(body.userId, {
              password: body.password,
            });
            if (error) return json({ error: error.message }, 400);
            return json({ user: data.user });
          }
          if (body.action === "access") {
            if (!body.userId || typeof body.enabled !== "boolean")
              return json({ error: "Usuário e status são obrigatórios" }, 400);
            const { data, error } = await admin.auth.admin.updateUserById(body.userId, {
              ban_duration: body.enabled ? "none" : "876000h",
            } as any);
            if (error) return json({ error: error.message }, 400);
            return json({ user: data.user });
          }
          if (body.action === "plan") {
            if (!body.userId || !body.planId)
              return json({ error: "Usuário e plano são obrigatórios" }, 400);
            const { data: plan } = await admin
              .from("plans")
              .select("id,price_cents,currency")
              .eq("id", body.planId)
              .maybeSingle();
            if (!plan) return json({ error: "Plano não encontrado" }, 404);
            const { data: profile } = await admin
              .from("profiles")
              .select("purchase_email")
              .eq("user_id", body.userId)
              .maybeSingle();
            await admin
              .from("subscriptions")
              .update({ status: "canceled", canceled_at: new Date().toISOString() })
              .eq("user_id", body.userId)
              .in("status", ["active", "pending"]);
            const { error } = await admin.from("subscriptions").insert({
              user_id: body.userId,
              plan_id: body.planId,
              customer_email: profile?.purchase_email ?? null,
              status: "active",
              amount_cents: plan.price_cents,
              currency: plan.currency,
              started_at: new Date().toISOString(),
            });
            if (error) return json({ error: error.message }, 400);
            return json({ ok: true });
          }
          return json({ error: "Ação inválida" }, 400);
        } catch (error) {
          if (error instanceof Response) return error;
          return json({ error: "Não foi possível salvar usuário" }, 500);
        }
      },
    },
  },
});
