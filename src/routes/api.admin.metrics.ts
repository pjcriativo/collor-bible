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

function resolvePeriod(request: Request) {
  const params = new URL(request.url).searchParams;
  const raw = params.get("period") as PeriodKey | "custom" | null;
  const customStart = params.get("start");
  const customEnd = params.get("end");
  if (raw === "custom" && customStart && customEnd) {
    const start = startOfUtcDay(new Date(customStart));
    const endDate = new Date(customEnd);
    const end = new Date(
      Date.UTC(
        endDate.getUTCFullYear(),
        endDate.getUTCMonth(),
        endDate.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return { period: "custom" as PeriodKey, label: `${fmt(start)} → ${fmt(endDate)}`, start, end };
  }
  const period: PeriodKey = raw && raw in PERIODS ? (raw as PeriodKey) : "30d";
  const now = new Date();
  const end = now;
  const start =
    period === "month"
      ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      : startOfUtcDay(now);
  if (period !== "month") start.setUTCDate(start.getUTCDate() - (PERIODS[period].days - 1));
  return { period, label: PERIODS[period].label, start, end };
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
    const key = toDayKey(sale.sold_at);
    const entry = map.get(key);
    if (!entry) return;
    entry.revenue += Number(sale.amount_cents ?? 0);
    entry.sales += 1;
  });
  return Array.from(map.values());
}

export const Route = createFileRoute("/api/admin/metrics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const admin = await requireAdmin(request);
          const { period, label, start, end } = resolvePeriod(request);
          const rangeStart = start.toISOString();
          const [
            { data: sales },
            { data: subscriptions },
            { data: plans },
            { data: profiles },
            { count: usersTotal },
          ] = await Promise.all([
            admin
              .from("sales")
              .select("amount_cents,status,sold_at,plans(name)")
              .gte("sold_at", rangeStart)
              .order("sold_at", { ascending: true })
              .limit(1000),
            admin
              .from("subscriptions")
              .select("status,current_period_end,amount_cents,plans(name)")
              .limit(1000),
            admin
              .from("plans")
              .select("id,name,active,price_cents,billing_interval,native_language")
              .order("created_at", { ascending: false }),
            admin
              .from("profiles")
              .select("id,user_id,display_name,purchase_email,created_at")
              .order("created_at", { ascending: false })
              .limit(20),
            admin.from("profiles").select("id", { count: "exact", head: true }),
          ]);
          const paidSales = (sales ?? []).filter((sale: any) =>
            PAID_STATUSES.has(String(sale.status).toLowerCase()),
          );
          const revenuePeriod = paidSales.reduce(
            (sum: number, sale: any) => sum + Number(sale.amount_cents ?? 0),
            0,
          );
          const planSales = paidSales.reduce<
            Record<string, { name: string; count: number; revenue: number }>
          >((acc, sale: any) => {
            const name = sale.plans?.name ?? "Sem plano";
            acc[name] = acc[name] ?? { name, count: 0, revenue: 0 };
            acc[name].count += 1;
            acc[name].revenue += Number(sale.amount_cents ?? 0);
            return acc;
          }, {});
          const subscriptionStatus = (subscriptions ?? []).reduce<Record<string, number>>(
            (acc, sub: any) => {
              const status = String(sub.status ?? "pending").toLowerCase();
              acc[status] = (acc[status] ?? 0) + 1;
              return acc;
            },
            {},
          );
          const activeSubscriptions = (subscriptions ?? []).filter(
            (sub: any) => String(sub.status).toLowerCase() === "active",
          );
          return json({
            period,
            periodLabel: label,
            revenueMonth: revenuePeriod,
            revenuePeriod,
            salesMonth: paidSales.length,
            salesPeriod: paidSales.length,
            averageTicket: paidSales.length ? Math.round(revenuePeriod / paidSales.length) : 0,
            activeSubscriptions: activeSubscriptions.length,
            mrr: activeSubscriptions.reduce(
              (sum: number, sub: any) => sum + Number(sub.amount_cents ?? 0),
              0,
            ),
            usersTotal: usersTotal ?? 0,
            topPlans: Object.values(planSales).sort((a, b) => b.revenue - a.revenue),
            dailyRevenue: buildDailyRevenue(start, end, paidSales),
            subscriptionStatus: Object.entries(subscriptionStatus).map(([status, count]) => ({
              status,
              count,
            })),
            recurrence: (subscriptions ?? []).map((sub: any) => ({
              plan: sub.plans?.name ?? "Sem plano",
              status: sub.status,
              nextBilling: sub.current_period_end,
            })),
            plans: plans ?? [],
            users: profiles ?? [],
          });
        } catch (error) {
          if (error instanceof Response) return error;
          return json({ error: "Não foi possível carregar métricas" }, 500);
        }
      },
    },
  },
});
