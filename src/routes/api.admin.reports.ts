import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const json = (body: unknown, status = 200) => Response.json(body, { status });
const PAID_STATUSES = new Set(["paid", "approved", "completed"]);
const PERIODS = {
  today: { label: "Hoje", days: 1 },
  "7d": { label: "Últimos 7 dias", days: 7 },
  "30d": { label: "Últimos 30 dias", days: 30 },
  "90d": { label: "Últimos 90 dias", days: 90 },
  month: { label: "Mês atual", days: 0 },
} as const;

type PeriodKey = keyof typeof PERIODS;

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
  const { userClient, adminClient } = getClients(authHeader);
  const { data: userData, error } = await userClient.auth.getUser();
  const user = userData.user;
  if (error || !user) throw new Response("Não autorizado", { status: 401 });
  const { data: roles } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");
  if (!roles?.length) throw new Response("Acesso negado", { status: 403 });
  return adminClient;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isoDaysAgo(days: number) {
  const date = startOfUtcDay(new Date());
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function resolvePeriod(request: Request) {
  const raw = new URL(request.url).searchParams.get("period") as PeriodKey | null;
  const period: PeriodKey = raw && raw in PERIODS ? raw : "30d";
  const now = new Date();
  const start =
    period === "month"
      ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      : startOfUtcDay(now);
  if (period !== "month") start.setUTCDate(start.getUTCDate() - (PERIODS[period].days - 1));
  return { period, label: PERIODS[period].label, start, end: now };
}

function toDayKey(value: string) {
  return value.slice(0, 10);
}

function buildDailyRevenue(start: Date, end: Date, sales: any[]) {
  const map = new Map<string, { date: string; label: string; revenue: number; sales: number }>();
  const cursor = startOfUtcDay(start);
  const last = startOfUtcDay(end);
  while (cursor <= last) {
    const key = cursor.toISOString().slice(0, 10);
    map.set(key, { date: key, label: key.slice(5), revenue: 0, sales: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  sales.forEach((sale) => {
    const date = toDayKey(sale.sold_at);
    const entry = map.get(date);
    if (!entry) return;
    entry.revenue += Number(sale.amount_cents ?? 0);
    entry.sales += 1;
  });
  return Array.from(map.values());
}

export const Route = createFileRoute("/api/admin/reports")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const admin = await requireAdmin(request);
          const now = new Date();
          const { period, label, start, end } = resolvePeriod(request);
          const todayStart = startOfUtcDay(now).toISOString();
          const monthStart = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
          ).toISOString();
          const last7Start = isoDaysAgo(6);
          const rangeStart = start.toISOString();
          const rangeEnd = end.toISOString();

          const [{ data: sales }, { data: subscriptions }, { data: plans }, { count: usersTotal }] =
            await Promise.all([
              admin
                .from("sales")
                .select("id,amount_cents,currency,status,sold_at,customer_email,plans(name)")
                .gte("sold_at", rangeStart)
                .lte("sold_at", rangeEnd)
                .order("sold_at", { ascending: false })
                .limit(1000),
              admin
                .from("subscriptions")
                .select(
                  "id,status,amount_cents,current_period_end,started_at,canceled_at,created_at,plans(name)",
                )
                .limit(2000),
              admin
                .from("plans")
                .select("id,name,active,price_cents,billing_interval")
                .order("created_at", { ascending: false }),
              admin
                .from("profiles")
                .select("id", { count: "exact", head: true })
                .lte("created_at", rangeEnd),
            ]);

          const paidSales = (sales ?? []).filter((sale: any) =>
            PAID_STATUSES.has(String(sale.status).toLowerCase()),
          );
          const inRange = (startIso: string) =>
            paidSales.filter((sale: any) => sale.sold_at >= startIso && sale.sold_at <= rangeEnd);
          const sum = (items: any[]) =>
            items.reduce((total, sale) => total + Number(sale.amount_cents ?? 0), 0);
          const todaySales = inRange(todayStart);
          const monthSales = inRange(monthStart);
          const last7Sales = inRange(last7Start);
          // Assinaturas consideradas "ativas" no período: criadas até o fim do período e ainda não canceladas (ou canceladas após o início do período)
          const subsList = subscriptions ?? [];
          const activeSubscriptions = subsList.filter((sub: any) => {
            const status = String(sub.status).toLowerCase();
            const createdAt = sub.started_at ?? sub.created_at;
            if (!createdAt || createdAt > rangeEnd) return false;
            if (status === "active") return !sub.canceled_at || sub.canceled_at > rangeEnd;
            return false;
          });
          const canceledSubscriptions = subsList.filter((sub: any) => {
            const status = String(sub.status).toLowerCase();
            if (!["canceled", "cancelled"].includes(status)) return false;
            const canceledAt = sub.canceled_at ?? sub.updated_at;
            return canceledAt && canceledAt >= rangeStart && canceledAt <= rangeEnd;
          });

          const planMap = paidSales.reduce<
            Record<string, { name: string; count: number; revenue: number }>
          >((acc, sale: any) => {
            const name = sale.plans?.name ?? "Sem plano";
            acc[name] = acc[name] ?? { name, count: 0, revenue: 0 };
            acc[name].count += 1;
            acc[name].revenue += Number(sale.amount_cents ?? 0);
            return acc;
          }, {});

          const statusMap = (subscriptions ?? []).reduce<Record<string, number>>(
            (acc, sub: any) => {
              const status = String(sub.status ?? "pending").toLowerCase();
              acc[status] = (acc[status] ?? 0) + 1;
              return acc;
            },
            {},
          );

          const mrr = activeSubscriptions.reduce(
            (total: number, sub: any) => total + Number(sub.amount_cents ?? 0),
            0,
          );
          const averageTicket = paidSales.length
            ? Math.round(sum(paidSales) / paidSales.length)
            : 0;

          return json({
            generatedAt: now.toISOString(),
            period,
            periodLabel: label,
            totals: {
              todayRevenue: sum(todaySales),
              todaySales: todaySales.length,
              monthRevenue: sum(monthSales),
              monthSales: monthSales.length,
              periodRevenue: sum(paidSales),
              periodSales: paidSales.length,
              last7Revenue: sum(last7Sales),
              last30Revenue: sum(paidSales),
              averageTicket,
              activeSubscriptions: activeSubscriptions.length,
              canceledSubscriptions: canceledSubscriptions.length,
              mrr,
              usersTotal: usersTotal ?? 0,
              activePlans: (plans ?? []).filter((plan: any) => plan.active).length,
            },
            topPlans: Object.values(planMap)
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 8),
            dailyRevenue: buildDailyRevenue(start, end, paidSales),
            subscriptionStatus: Object.entries(statusMap).map(([status, count]) => ({
              status,
              count,
            })),
            recentSales: paidSales.slice(0, 12).map((sale: any) => ({
              id: sale.id,
              plan: sale.plans?.name ?? "Sem plano",
              amount: Number(sale.amount_cents ?? 0),
              status: sale.status,
              email: sale.customer_email,
              soldAt: sale.sold_at,
            })),
          });
        } catch (error) {
          if (error instanceof Response) return error;
          return json({ error: "Não foi possível carregar relatórios" }, 500);
        }
      },
    },
  },
});
