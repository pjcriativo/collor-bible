import { useEffect, useState } from "react";
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
  CalendarClock,
  CalendarRange,
  TrendingUp,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import { localizeBackendPeriod, localizeBackendStatus, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

const PERIODS = [
  { value: "today", labelKey: "today" },
  { value: "7d", labelKey: "days7" },
  { value: "30d", labelKey: "days30" },
  { value: "90d", labelKey: "days90" },
  { value: "month", labelKey: "month" },
] as const;

type Period = (typeof PERIODS)[number]["value"] | "custom";
type TFunction = ReturnType<typeof useI18n>["t"];
type Metrics = {
  period: Period;
  periodLabel: string;
  revenuePeriod: number;
  salesPeriod: number;
  averageTicket: number;
  activeSubscriptions: number;
  mrr: number;
  usersTotal: number;
  topPlans: Array<{ name: string; count: number; revenue: number }>;
  dailyRevenue: Array<{ date: string; label: string; revenue: number; sales: number }>;
  subscriptionStatus: Array<{ status: string; count: number }>;
  recurrence: Array<{ plan: string; status: string; nextBilling: string | null }>;
  plans: Array<{
    id: string;
    name: string;
    active: boolean;
    price_cents: number;
    billing_interval: string;
    native_language: string;
  }>;
  users: Array<{
    user_id: string;
    display_name: string | null;
    purchase_email: string | null;
    created_at: string;
  }>;
};

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

async function authFetch(url: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

/**
 * Dashboard do admin — APENAS RESUMOS DE MÉTRICAS.
 *
 * Outras seções (idiomas, integrações PerfectPay/webhooks, criação de
 * usuário, troca de senha) vivem agora em rotas dedicadas no menu
 * lateral: `/admin/idiomas`, `/admin/integracoes` e `/admin/usuarios`.
 * Isso deixa o dashboard focado no que importa em uma visão executiva:
 * receita, vendas, planos, MRR e status de assinaturas.
 */
function AdminDashboard() {
  const { language, t } = useI18n();
  const [period, setPeriod] = useState<Period>("30d");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const load = async (
    selectedPeriod: Period = period,
    range: DateRange | undefined = customRange,
  ) => {
    let url = `/api/admin/metrics?period=${selectedPeriod}`;
    if (selectedPeriod === "custom") {
      if (!range?.from || !range?.to) return;
      url += `&start=${range.from.toISOString()}&end=${range.to.toISOString()}`;
    }
    const res = await authFetch(url);
    if (!res.ok) return toast.error("Não foi possível carregar o dashboard");
    setMetrics(await res.json());
  };

  useEffect(() => {
    load(period, customRange);
  }, [period, customRange?.from, customRange?.to]);

  const bestPlan = metrics?.topPlans[0]?.name ?? t("noPaidSalesPeriod");
  const planChart = (
    metrics?.topPlans.length
      ? metrics.topPlans
      : [{ name: t("noPaidSalesPeriod"), count: 0, revenue: 0 }]
  ).slice(0, 6);
  const statusChart = metrics?.subscriptionStatus.length
    ? metrics.subscriptionStatus
    : [{ status: t("noData"), count: 1 }];
  const statusTotal = metrics?.subscriptionStatus.reduce((sum, item) => sum + item.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card/70 p-6 shadow-cinematic backdrop-blur-xl sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              {t("overview")}
            </p>
            <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
              {t("dashboard")}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{t("dashboardSub")}</p>
          </div>
          <PeriodFilter
            value={period}
            onChange={(next) => {
              setPeriod(next);
              if (next !== "custom") setCustomRange(undefined);
            }}
            range={customRange}
            onRangeChange={(range) => {
              setCustomRange(range);
              setPeriod("custom");
            }}
            t={t}
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={TrendingUp}
          label={t("periodRevenue")}
          value={money(metrics?.revenuePeriod ?? 0)}
          sub={`${t("salesCount", { count: metrics?.salesPeriod ?? 0 })} · ${localizeBackendPeriod(language, metrics?.period, metrics?.periodLabel)}`}
        />
        <Metric
          icon={WalletCards}
          label={t("championPlan")}
          value={bestPlan}
          sub={t("bestSellingMonth")}
        />
        <Metric
          icon={CalendarClock}
          label="MRR"
          value={money(metrics?.mrr ?? 0)}
          sub={`${metrics?.activeSubscriptions ?? 0} ${t("activeSubscriptions").toLowerCase()}`}
        />
        <Metric
          icon={Users}
          label={t("averageTicket")}
          value={money(metrics?.averageTicket ?? 0)}
          sub={`${metrics?.usersTotal ?? 0} ${t("registeredUsers").toLowerCase()}`}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <Panel title={t("revenueSalesVolume")} className="xl:col-span-2">
          <ChartContainer
            config={{
              revenue: { label: t("revenue"), color: "var(--primary)" },
              sales: { label: t("sales"), color: "var(--accent)" },
            }}
            className="h-[320px] w-full"
          >
            <AreaChart data={metrics?.dailyRevenue ?? []} margin={{ left: 8, right: 8, top: 12 }}>
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
        <Panel title={t("subscriptionStatus")} className="xl:col-span-2">
          <div className="grid min-h-[320px] items-center gap-5 lg:grid-cols-[1fr_0.78fr]">
            <div className="relative mx-auto flex h-[280px] w-full max-w-[360px] items-center justify-center">
              <ChartContainer
                config={{ count: { label: t("subscriptions"), color: "var(--primary)" } }}
                className="h-full w-full"
              >
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <ChartTooltip content={<CountTooltip labelText={t("subscriptions")} />} />
                  <Pie
                    data={statusChart.map((item) => ({
                      ...item,
                      label: localizeBackendStatus(language, item.status),
                    }))}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={76}
                    outerRadius={112}
                    paddingAngle={5}
                    cornerRadius={10}
                    stroke="var(--card)"
                    strokeWidth={6}
                  >
                    {statusChart.map((entry, index) => (
                      <Cell
                        key={entry.status}
                        fill={
                          index % 3 === 0
                            ? "var(--primary)"
                            : index % 3 === 1
                              ? "var(--sky)"
                              : "var(--mint)"
                        }
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-display text-3xl font-extrabold text-foreground">
                  {statusTotal}
                </span>
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("subscriptions")}
                </span>
              </div>
            </div>
            <div className="space-y-2 rounded-2xl border border-border bg-background/45 p-3">
              {statusChart.map((item, index) => (
                <StatusLegendItem
                  key={item.status}
                  label={localizeBackendStatus(language, item.status)}
                  count={metrics?.subscriptionStatus.length ? item.count : 0}
                  color={index % 3 === 0 ? "bg-primary" : index % 3 === 1 ? "bg-sky" : "bg-mint"}
                />
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <Panel title={t("topSellingPlans")} className="xl:col-span-2">
          <ChartContainer
            config={{ count: { label: t("sales"), color: "var(--primary)" } }}
            className="h-[280px] w-full"
          >
            <BarChart data={planChart} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={112} />
              <ChartTooltip content={<PlanTooltip />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 10, 10, 0]} />
            </BarChart>
          </ChartContainer>
        </Panel>
        <Panel title={t("monthlyRecurrence")} className="xl:col-span-2">
          {(metrics?.recurrence.length ?? 0) > 0 ? (
            metrics?.recurrence
              .slice(0, 6)
              .map((item, index) => (
                <Row
                  key={`${item.plan}-${index}`}
                  left={`${item.plan} · ${localizeBackendStatus(language, item.status)}`}
                  right={
                    item.nextBilling
                      ? new Date(item.nextBilling).toLocaleDateString("pt-BR")
                      : t("noDate")
                  }
                />
              ))
          ) : (
            <Empty>{t("noActiveRecurring")}</Empty>
          )}
        </Panel>
      </section>
    </div>
  );
}

function PeriodFilter({
  value,
  onChange,
  range,
  onRangeChange,
  t,
}: {
  value: Period;
  onChange: (value: Period) => void;
  range: DateRange | undefined;
  onRangeChange: (range: DateRange | undefined) => void;
  t: TFunction;
}) {
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  const customLabel =
    range?.from && range?.to ? `${fmt(range.from)} – ${fmt(range.to)}` : t("customRange");
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-background/70 p-1.5">
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
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${value === "custom" ? "bg-primary text-primary-foreground shadow-glow-gold" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
          >
            <CalendarRange className="h-3.5 w-3.5" />
            {customLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={range}
            onSelect={onRangeChange}
            defaultMonth={range?.from ?? new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
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
  const isLong = value.length > 18;
  return (
    <div className="group rounded-3xl border border-border bg-card/85 p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
        <Icon className="h-5 w-5" />
      </div>
      <div
        className={`min-h-8 font-display font-extrabold leading-tight text-foreground ${isLong ? "text-sm" : "text-2xl"}`}
      >
        {value}
      </div>
      <div className="mt-1 text-sm font-bold text-foreground">{label}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
function Panel({
  title,
  children,
  id,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div
      id={id}
      className={`rounded-3xl border border-border bg-card/85 p-5 shadow-card backdrop-blur-xl ${className}`}
    >
      <h2 className="font-display text-lg font-extrabold text-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}
function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 text-sm last:border-0">
      <span className="min-w-0 truncate font-bold text-foreground">{left}</span>
      <span className="shrink-0 text-muted-foreground">{right}</span>
    </div>
  );
}
function StatusLegendItem({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-sm">
      <span className="flex min-w-0 items-center gap-2 font-bold text-foreground">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
        <span className="truncate">{label}</span>
      </span>
      <span className="font-display font-extrabold text-primary">{count}</span>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
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
