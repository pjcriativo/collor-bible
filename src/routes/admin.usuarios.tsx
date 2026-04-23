import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  Copy,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  UserRound,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/usuarios")({ component: AdminUsersPage });

type Payment = {
  id: string;
  status: string;
  amount_cents: number;
  sold_at: string;
  plans?: { name?: string } | { name?: string }[] | null;
};
type AdminUser = {
  user_id: string;
  display_name: string | null;
  purchase_email: string | null;
  created_at: string;
  accessEnabled: boolean;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  nextBilling: string | null;
  totalPaidCents: number;
  payments: Payment[];
};
type Plan = {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  billing_interval: string;
};
type TFunction = ReturnType<typeof useI18n>["t"];

const STATUS_FILTERS = [
  { value: "all", labelKey: "all" },
  { value: "active", labelKey: "active" },
  { value: "pending", labelKey: "pending" },
  { value: "canceled", labelKey: "canceledPlural" },
  { value: "no_subscription", labelKey: "noPlan" },
] as const;

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function csvCell(value: string | number | null | undefined) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

async function authFetch(url: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  let token = data.session?.access_token;
  const expSoon = data.session?.expires_at && data.session.expires_at * 1000 < Date.now() + 30_000;
  if (!token || expSoon) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    token = refreshed.session?.access_token ?? token;
  }
  if (!token) {
    // último recurso: aguardar a sessão hidratar
    await new Promise((r) => setTimeout(r, 250));
    const { data: again } = await supabase.auth.getSession();
    token = again.session?.access_token;
  }
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

function AdminUsersPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const loadUsers = async (): Promise<void> => {
    setLoading(true);
    const params = new URLSearchParams({ search, status });
    const res = await authFetch(`/api/admin/users?${params.toString()}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? t("actionFailed"));
      return;
    }
    const nextUsers = data.users ?? [];
    setUsers(nextUsers);
    setPlans(data.plans ?? []);
    setSelectedId((current) =>
      nextUsers.some((user: AdminUser) => user.user_id === current)
        ? current
        : (nextUsers[0]?.user_id ?? null),
    );
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadUsers();
    }, 250);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [search, status]);

  const selected = useMemo(
    () => users.find((user) => user.user_id === selectedId) ?? users[0],
    [users, selectedId],
  );
  const summary = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.subscriptionStatus === "active" && user.accessEnabled)
        .length,
      blocked: users.filter((user) => !user.accessEnabled).length,
      revenue: users.reduce((total, user) => total + user.totalPaidCents, 0),
    }),
    [users],
  );

  const exportUsersCsv = () => {
    const header = [
      t("name"),
      t("email"),
      "ID",
      t("status"),
      t("activeSubscription"),
      t("plan"),
      t("totalPaid"),
      t("clientSince", { date: "" }).trim(),
    ];
    const rows = users.map((user) => [
      user.display_name ?? t("user"),
      user.purchase_email ?? "",
      user.user_id,
      user.accessEnabled ? t("active") : t("blocked"),
      labelStatus(user.subscriptionStatus, t),
      user.subscriptionPlan ?? t("noPlan"),
      money(user.totalPaidCents),
      new Date(user.created_at).toLocaleDateString("pt-BR"),
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card/70 p-6 shadow-cinematic backdrop-blur-xl sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              {t("customerOperations")}
            </p>
            <h1 className="mt-1 font-display text-3xl font-extrabold text-foreground sm:text-4xl">
              {t("users")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("usersSub")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground shadow-glow-gold"
            >
              <Plus className="h-4 w-4" /> {t("createUser")}
            </button>
            <button
              type="button"
              onClick={exportUsersCsv}
              disabled={users.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 text-sm font-extrabold text-foreground hover:bg-secondary disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> {t("exportCsv")}
            </button>
          </div>
        </div>
      </section>

      {createOpen && (
        <CreateUserModal
          plans={plans}
          onClose={() => setCreateOpen(false)}
          onCreated={async (newId) => {
            setCreateOpen(false);
            await loadUsers();
            if (newId) setSelectedId(newId);
          }}
          t={t}
        />
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={Users}
          label={t("filteredUsers")}
          value={String(summary.total)}
          sub={loading ? t("updatingList") : t("currentResult")}
        />
        <Metric
          icon={BadgeCheck}
          label={t("activeSubscriptions")}
          value={String(summary.active)}
          sub={t("accessReleased")}
        />
        <Metric
          icon={ShieldOff}
          label={t("blockedAccesses")}
          value={String(summary.blocked)}
          sub={t("usersWithoutRelease")}
        />
        <Metric
          icon={WalletCards}
          label={t("displayedRevenue")}
          value={money(summary.revenue)}
          sub={t("totalPaidList")}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-3xl border border-border bg-card/85 p-5 shadow-card backdrop-blur-xl">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="flex items-center gap-2 rounded-2xl border border-input bg-background/80 px-4 py-3 text-sm shadow-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchUsersPlaceholder")}
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-2xl border border-input bg-background/80 px-4 py-3 text-sm font-bold outline-none"
            >
              <option value="all">{t("allStatuses")}</option>
              <option value="active">{t("activeSubscription")}</option>
              <option value="pending">{t("pending")}</option>
              <option value="canceled">{t("canceled")}</option>
              <option value="no_subscription">{t("noSubscription")}</option>
            </select>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatus(filter.value)}
                className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${status === filter.value ? "bg-primary text-primary-foreground shadow-glow-gold" : "bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
              >
                {t(filter.labelKey)}
              </button>
            ))}
          </div>
          <div className="premium-scrollbar mt-5 max-h-[660px] space-y-3 overflow-y-auto pr-1">
            {users.map((user) => (
              <UserListItem
                key={user.user_id}
                user={user}
                selected={selected?.user_id === user.user_id}
                onSelect={() => setSelectedId(user.user_id)}
                t={t}
              />
            ))}
            {users.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center text-sm text-muted-foreground">
                {t("noUsersFound")}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-card/85 p-5 shadow-card backdrop-blur-xl">
          {selected ? (
            <UserDetails user={selected} plans={plans} onChanged={loadUsers} t={t} />
          ) : (
            <p className="text-sm text-muted-foreground">{t("selectUserDetails")}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function UserListItem({
  user,
  selected,
  onSelect,
  t,
}: {
  user: AdminUser;
  selected: boolean;
  onSelect: () => void;
  t: TFunction;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-4 text-left transition ${selected ? "border-primary bg-primary/10 shadow-glow-gold" : "border-border bg-background/70 hover:border-primary/30 hover:bg-secondary/60"}`}
    >
      <div className="flex items-start gap-3">
        <Avatar name={user.display_name ?? user.purchase_email ?? "U"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-extrabold text-foreground">
                {user.display_name ?? t("user")}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {user.purchase_email ?? user.user_id}
              </div>
            </div>
            <StatusBadge status={user.accessEnabled ? user.subscriptionStatus : "blocked"} t={t} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <MiniStat label={t("plan")} value={user.subscriptionPlan ?? t("noPlan")} />
            <MiniStat label={t("totalPaid")} value={money(user.totalPaidCents)} />
          </div>
        </div>
      </div>
    </button>
  );
}

function UserDetails({
  user,
  plans,
  onChanged,
  t,
}: {
  user: AdminUser;
  plans: Plan[];
  onChanged: () => Promise<void>;
  t: TFunction;
}) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [planId, setPlanId] = useState(
    plans.find((plan) => plan.name === user.subscriptionPlan)?.id ?? plans[0]?.id ?? "",
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPlanId(plans.find((plan) => plan.name === user.subscriptionPlan)?.id ?? plans[0]?.id ?? "");
  }, [plans, user.subscriptionPlan, user.user_id]);

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(t("copied", { label }));
  };

  const runAction = async (body: Record<string, unknown>, success: string) => {
    setSaving(true);
    const res = await authFetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return toast.error(data.error ?? t("actionFailed"));
    toast.success(success);
    setPassword("");
    await onChanged();
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-border bg-background/70 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar name={user.display_name ?? user.purchase_email ?? "U"} large />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap gap-2">
                <StatusBadge
                  status={user.accessEnabled ? user.subscriptionStatus : "blocked"}
                  t={t}
                />
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground">
                  {t("clientSince", {
                    date: new Date(user.created_at).toLocaleDateString("pt-BR"),
                  })}
                </span>
              </div>
              <h2 className="truncate font-display text-2xl font-extrabold text-foreground">
                {user.display_name ?? t("user")}
              </h2>
              <p className="truncate text-sm text-muted-foreground">
                {user.purchase_email ?? user.user_id}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {user.purchase_email && (
              <IconButton
                title={t("copyEmail")}
                onClick={() => copy(user.purchase_email!, "Email")}
                icon={Mail}
              />
            )}
            <IconButton title={t("copyId")} onClick={() => copy(user.user_id, "ID")} icon={Copy} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Info label={t("status")} value={labelStatus(user.subscriptionStatus, t)} />
        <Info label={t("plan")} value={user.subscriptionPlan ?? t("noPlan")} />
        <Info label={t("totalPaid")} value={money(user.totalPaidCents)} />
        <Info
          label={t("nextBilling")}
          value={
            user.nextBilling ? new Date(user.nextBilling).toLocaleDateString("pt-BR") : t("noDate")
          }
        />
      </div>

      <div className="rounded-3xl border border-border bg-background/70 p-5">
        <h3 className="mb-4 flex items-center gap-2 font-display text-base font-extrabold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" /> {t("quickActions")}
        </h3>
        <div className="grid gap-3">
          <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("newPassword")}
                className="w-full rounded-2xl border border-input bg-card px-4 py-3 pr-12 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              disabled={saving || password.length < 6}
              onClick={() =>
                runAction(
                  { action: "password", userId: user.user_id, password },
                  t("passwordChanged"),
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" /> {t("changePassword")}
            </button>
          </div>
          <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
            <Select
              value={planId || undefined}
              onValueChange={(v) => setPlanId(v)}
              disabled={plans.length === 0}
            >
              <SelectTrigger className="rounded-2xl border border-input bg-card px-4 py-3 text-sm text-foreground h-auto focus:ring-2 focus:ring-ring">
                <SelectValue
                  placeholder={
                    plans.length === 0 ? "Nenhum plano disponível" : "Selecione um plano"
                  }
                />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border border-border bg-card text-foreground">
                {plans.map((plan) => (
                  <SelectItem
                    key={plan.id}
                    value={plan.id}
                    className="rounded-xl focus:bg-secondary focus:text-foreground"
                  >
                    {plan.name} · {money(plan.price_cents)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              disabled={saving || !planId}
              onClick={() =>
                runAction({ action: "plan", userId: user.user_id, planId }, t("planAssigned"))
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-3 text-sm font-extrabold text-secondary-foreground disabled:opacity-50"
            >
              <WalletCards className="h-4 w-4" /> {t("assignPlan")}
            </button>
          </div>
          <button
            disabled={saving}
            onClick={() =>
              runAction(
                { action: "access", userId: user.user_id, enabled: !user.accessEnabled },
                user.accessEnabled ? t("accessDisabled") : t("accessEnabled"),
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border px-5 py-3 text-sm font-extrabold hover:bg-accent disabled:opacity-50"
          >
            {user.accessEnabled ? (
              <ShieldOff className="h-4 w-4" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}{" "}
            {user.accessEnabled ? t("disableAccess") : t("enableAccess")}
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 font-display text-base font-extrabold text-foreground">
          <WalletCards className="h-4 w-4 text-primary" /> {t("paymentHistory")}
        </h3>
        <div className="overflow-hidden rounded-2xl border border-border bg-background/70">
          {user.payments.length > 0 ? (
            user.payments.map((payment) => <PaymentRow key={payment.id} payment={payment} t={t} />)
          ) : (
            <p className="p-4 text-sm text-muted-foreground">{t("noPaymentsUser")}</p>
          )}
        </div>
      </div>
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
function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return (
    <div
      className={`${large ? "h-14 w-14 text-lg" : "h-11 w-11 text-sm"} flex shrink-0 items-center justify-center rounded-2xl bg-primary/15 font-display font-extrabold text-primary ring-1 ring-primary/20`}
    >
      <UserRound className={large ? "h-6 w-6" : "h-5 w-5"} />
    </div>
  );
}
function IconButton({
  title,
  icon: Icon,
  onClick,
}: {
  title: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-card/80 p-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="truncate font-display text-xs font-extrabold text-foreground">{value}</div>
    </div>
  );
}
function labelStatus(status: string, t: TFunction) {
  return (
    (
      {
        active: t("activeSubscription"),
        pending: t("pending"),
        canceled: t("canceled"),
        no_subscription: t("noSubscription"),
        blocked: t("blocked"),
      } as Record<string, string>
    )[status] ?? status
  );
}
function StatusBadge({ status, t }: { status: string; t: TFunction }) {
  return (
    <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground ring-1 ring-border">
      {labelStatus(status, t)}
    </span>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-display text-sm font-extrabold text-foreground">
        {value}
      </div>
    </div>
  );
}
function PaymentRow({ payment, t }: { payment: Payment; t: TFunction }) {
  const plan = Array.isArray(payment.plans) ? payment.plans[0]?.name : payment.plans?.name;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border p-3 text-sm last:border-0">
      <div className="min-w-0">
        <div className="truncate font-semibold text-foreground">{plan ?? t("payment")}</div>
        <div className="text-xs text-muted-foreground">
          {new Date(payment.sold_at).toLocaleDateString("pt-BR")} · {payment.status}
        </div>
      </div>
      <div className="font-display font-bold text-foreground">{money(payment.amount_cents)}</div>
    </div>
  );
}

function CreateUserModal({
  plans,
  onClose,
  onCreated,
  t,
}: {
  plans: Plan[];
  onClose: () => void;
  onCreated: (newUserId: string | null) => void | Promise<void>;
  t: TFunction;
}) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [planId, setPlanId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let out = "";
    for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
    setPassword(out);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || password.length < 6) {
      toast.error(t("actionFailed"));
      return;
    }
    setSaving(true);
    const res = await authFetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        email,
        password,
        displayName: displayName || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSaving(false);
      toast.error(data.error ?? t("actionFailed"));
      return;
    }
    const newUserId: string | null = data.user?.id ?? null;
    if (planId && newUserId) {
      await authFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "plan", userId: newUserId, planId }),
      });
    }
    setSaving(false);
    toast.success(t("createUser"));
    await onCreated(newUserId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-lg space-y-4 rounded-3xl border border-border bg-card p-6 shadow-cinematic"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              {t("userCreation")}
            </p>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-foreground">
              {t("createUser")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("name")}</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Minha criança"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">{t("email")}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-muted-foreground">
            {t("initialPassword")}
          </span>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              type="text"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={generatePassword}
              className="rounded-2xl border border-border bg-card px-4 py-3 text-xs font-extrabold hover:bg-secondary"
            >
              Gerar
            </button>
          </div>
        </label>
        {plans.length > 0 && (
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-muted-foreground">
              {t("plan")} ({t("noPlan")})
            </span>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— {t("noPlan")} —</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} · {money(plan.price_cents)}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-border bg-card px-5 py-3 text-sm font-extrabold hover:bg-secondary"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={saving || !email || password.length < 6}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground shadow-glow-gold disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {saving ? t("creating") : t("createUser")}
          </button>
        </div>
      </form>
    </div>
  );
}
