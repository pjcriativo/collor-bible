import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CreditCard,
  DollarSign,
  RefreshCcw,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { localizeBackendPeriod, localizeBackendStatus, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/relatorios")({ component: AdminReportsPage });

const PERIODS = [
  { value: "today", labelKey: "today" },
  { value: "7d", labelKey: "days7" },
  { value: "30d", labelKey: "days30" },
  { value: "90d", labelKey: "days90" },
  { value: "month", labelKey: "month" },
] as const;

type TFunction = ReturnType<typeof useI18n>["t"];

type Period = (typeof PERIODS)[number]["value"];
type ReportData = {
  generatedAt: string;
  period: Period;
  periodLabel: string;
  totals: {
    todayRevenue: number;
    todaySales: number;
    monthRevenue: number;
    monthSales: number;
    periodRevenue: number;
    periodSales: number;
    last7Revenue: number;
    last30Revenue: number;
    averageTicket: number;
    activeSubscriptions: number;
    canceledSubscriptions: number;
    mrr: number;
    usersTotal: number;
    activePlans: number;
  };
  topPlans: Array<{ name: string; count: number; revenue: number }>;
  dailyRevenue: Array<{ date: string; label: string; revenue: number; sales: number }>;
  subscriptionStatus: Array<{ status: string; count: number }>;
  recentSales: Array<{
    id: string;
    plan: string;
    amount: number;
    status: string;
    email: string | null;
    soldAt: string;
  }>;
};

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

async function authFetch(url: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(url, {
    ...init,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
  });
}

function AdminReportsPage() {
  const { language, t } = useI18n();
  const [period, setPeriod] = useState<Period>("30d");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = async (selectedPeriod = period) => {
    setLoading(true);
    const res = await authFetch(`/api/admin/reports?period=${selectedPeriod}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return toast.error(data.error ?? "Erro ao carregar relatórios");
    setReport(data);
  };

  useEffect(() => {
    loadReport(period);
  }, [period]);

  const bestPlan = report?.topPlans[0];
  const planChart = useMemo(
    () =>
      (report?.topPlans.length
        ? report.topPlans
        : [{ name: t("noPaidSalesPeriod"), count: 0, revenue: 0 }]
      ).slice(0, 8),
    [report, t],
  );
  const statusChart = report?.subscriptionStatus.length
    ? report.subscriptionStatus
    : [{ status: "no_data", count: 1 }];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-cinematic backdrop-blur-xl sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              {t("businessIntelligence")}
            </p>
            <h1 className="mt-1 font-display text-3xl font-extrabold text-foreground sm:text-4xl">
              {t("reports")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("reportsSub")}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <PeriodFilter value={period} onChange={setPeriod} t={t} />
            <button
              type="button"
              onClick={() => loadReport()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground shadow-glow-gold disabled:opacity-60"
            >
              <RefreshCcw className="h-4 w-4" /> {loading ? t("refreshing") : t("refresh")}
            </button>
          </div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={DollarSign}
          label={t("periodRevenue")}
          value={money(report?.totals.periodRevenue ?? 0)}
          sub={`${t("salesCount", { count: report?.totals.periodSales ?? 0 })} · ${localizeBackendPeriod(language, report?.period, report?.periodLabel)}`}
        />
        <Metric
          icon={TrendingUp}
          label={t("monthSales")}
          value={money(report?.totals.monthRevenue ?? 0)}
          sub={t("paidSalesPlain", { count: report?.totals.monthSales ?? 0 })}
        />
        <Metric
          icon={RefreshCcw}
          label={t("mrrEstimated")}
          value={money(report?.totals.mrr ?? 0)}
          sub={`${report?.totals.activeSubscriptions ?? 0} ${t("activeSubscriptions").toLowerCase()}`}
        />
        <Metric
          icon={CreditCard}
          label={t("averageTicket")}
          value={money(report?.totals.averageTicket ?? 0)}
          sub={t("averageSelectedPeriod")}
        />
      </section>

      <section className="grid items-stretch gap-4 lg:grid-cols-2">
        <Panel title={t("revenueSalesVolume")} icon={BarChart3}>
          <ChartContainer
            config={{
              revenue: { label: t("revenue"), color: "var(--primary)" },
              sales: { label: t("sales"), color: "var(--accent)" },
            }}
            className="h-[340px] w-full"
          >
            <AreaChart data={report?.dailyRevenue ?? []} margin={{ left: 8, right: 8, top: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => money(Number(value)).replace(",00", "")}
                width={72}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                width={34}
              />
              <ChartTooltip content={<MoneyTooltip />} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                fill="var(--color-revenue)"
                fillOpacity={0.18}
                strokeWidth={3}
              />
              <Bar
                yAxisId="right"
                dataKey="sales"
                fill="var(--color-sales)"
                radius={[8, 8, 0, 0]}
              />
            </AreaChart>
          </ChartContainer>
        </Panel>

        <Panel title={t("executiveSummary")} icon={Activity}>
          <div className="space-y-3">
            <InfoRow
              label={t("championPlan")}
              value={
                bestPlan
                  ? `${bestPlan.name} · ${t("salesCount", { count: bestPlan.count })}`
                  : t("noPaidSalesPeriod")
              }
            />
            <InfoRow
              label={t("revenueLast7Days")}
              value={money(report?.totals.last7Revenue ?? 0)}
            />
            <InfoRow
              label={t("salesToday")}
              value={`${money(report?.totals.todayRevenue ?? 0)} · ${report?.totals.todaySales ?? 0}`}
            />
            <InfoRow
              label={t("canceledSubscriptions")}
              value={String(report?.totals.canceledSubscriptions ?? 0)}
            />
            <InfoRow label={t("registeredUsers")} value={String(report?.totals.usersTotal ?? 0)} />
            <InfoRow label={t("activePlans")} value={String(report?.totals.activePlans ?? 0)} />
          </div>
        </Panel>
      </section>

      <section className="grid items-stretch gap-4 lg:grid-cols-2">
        <Panel title={t("bestSellingPlans")} icon={CalendarDays}>
          <ChartContainer
            config={{ count: { label: t("sales"), color: "var(--primary)" } }}
            className="h-[310px] w-full"
          >
            <BarChart data={planChart} layout="vertical" margin={{ left: 8, right: 18 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={116} />
              <ChartTooltip content={<PlanTooltip />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 10, 10, 0]} />
            </BarChart>
          </ChartContainer>
        </Panel>

        <Panel title={t("subscriptionStatus")} icon={Users}>
          <ChartContainer
            config={{ count: { label: t("subscriptions"), color: "var(--primary)" } }}
            className="h-[310px] w-full"
          >
            <PieChart>
              <ChartTooltip content={<CountTooltip labelText={t("subscriptions")} />} />
              <Pie
                data={statusChart.map((item) => ({
                  ...item,
                  label: localizeBackendStatus(language, item.status),
                }))}
                dataKey="count"
                nameKey="label"
                innerRadius={70}
                outerRadius={108}
                paddingAngle={4}
              >
                {statusChart.map((entry, index) => (
                  <Cell key={entry.status} fill={index % 2 ? "var(--accent)" : "var(--primary)"} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </Panel>
      </section>

      <section className="grid items-stretch gap-4 lg:grid-cols-2">
        <Panel title={t("planRanking")} icon={CalendarDays}>
          <div className="space-y-3">
            {(report?.topPlans.length ?? 0) > 0 ? (
              report?.topPlans.map((plan) => <PlanRow key={plan.name} plan={plan} t={t} />)
            ) : (
              <Empty>{t("noPaidSalesPeriod")}</Empty>
            )}
          </div>
        </Panel>
        <Panel title={t("recentSales")} icon={Users}>
          <div className="overflow-hidden rounded-xl border border-border">
            {(report?.recentSales.length ?? 0) > 0 ? (
              report?.recentSales.map((sale) => (
                <SaleRow key={sale.id} sale={sale} t={t} language={language} />
              ))
            ) : (
              <Empty>{t("noRecentSales")}</Empty>
            )}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function PeriodFilter({
  value,
  onChange,
  t,
}: {
  value: Period;
  onChange: (value: Period) => void;
  t: TFunction;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-background/70 p-1.5">
      {PERIODS.map((period) => (
        <button
          key={period.value}
          type="button"
          onClick={() => onChange(period.value)}
          className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${value === period.value ? "bg-primary text-primary-foreground shadow-glow-gold" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
        >
          {t(period.labelKey)}
        </button>
      ))}
    </div>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card/85 p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-display text-2xl font-extrabold leading-tight text-foreground">
        {value}
      </div>
      <div className="mt-1 text-sm font-bold text-foreground">{label}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card/85 p-5 shadow-card backdrop-blur-xl">
      <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-foreground">
        <Icon className="h-5 w-5 text-primary" /> {title}
      </h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-display font-bold">{value}</span>
    </div>
  );
}
function PlanRow({
  plan,
  t,
}: {
  plan: { name: string; count: number; revenue: number };
  t: TFunction;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-sm font-bold text-foreground">{plan.name}</span>
        <span className="text-sm text-muted-foreground">
          {t("salesCount", { count: plan.count })}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary shadow-glow-gold"
          style={{ width: `${Math.min(plan.count * 18, 100)}%` }}
        />
      </div>
      <div className="mt-3 text-sm font-bold text-foreground">{money(plan.revenue)}</div>
    </div>
  );
}
function SaleRow({
  sale,
  t,
  language,
}: {
  sale: ReportData["recentSales"][number];
  t: TFunction;
  language: ReturnType<typeof useI18n>["language"];
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border p-3 text-sm last:border-0">
      <div className="min-w-0">
        <div className="truncate font-semibold">{sale.plan}</div>
        <div className="truncate text-xs text-muted-foreground">
          {sale.email ?? t("noEmail")} · {localizeBackendStatus(language, sale.status)} ·{" "}
          {new Date(sale.soldAt).toLocaleDateString("pt-BR")}
        </div>
      </div>
      <div className="font-display font-bold">{money(sale.amount)}</div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="p-4 text-sm text-muted-foreground">{children}</p>;
}
function MoneyTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-background p-3 text-xs shadow-xl">
      <div className="mb-1 font-bold text-foreground">{label}</div>
      {payload.map((item) => (
        <div key={item.dataKey} className="flex gap-3 text-muted-foreground">
          <span>{item.name}</span>
          <b className="text-foreground">
            {item.dataKey === "revenue" ? money(Number(item.value ?? 0)) : Number(item.value ?? 0)}
          </b>
        </div>
      ))}
    </div>
  );
}
function CountTooltip({
  active,
  payload,
  labelText,
}: TooltipProps<number, string> & { labelText: string }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl border border-border bg-background p-3 text-xs shadow-xl">
      <b className="text-foreground">{item.name}</b>
      <div className="text-muted-foreground">
        {Number(item.value ?? 0)} {labelText.toLowerCase()}
      </div>
    </div>
  );
}
function PlanTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-background p-3 text-xs shadow-xl">
      <b className="text-foreground">{label}</b>
      <div className="text-muted-foreground">{Number(payload[0].value ?? 0)} vendas</div>
    </div>
  );
}
