import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  PlugZap,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/integracoes")({ component: AdminIntegrationsPage });

/**
 * Faz o parse do error_message gravado pelo webhook ("Validação falhou: path: msg; path2: msg2")
 * e retorna issues estruturados para exibir no admin.
 */
function parseValidationIssues(
  errorMessage: string | null,
): Array<{ path: string; message: string }> {
  if (!errorMessage) return [];
  const stripped = errorMessage.replace(/^Validação falhou:\s*/i, "").trim();
  if (!stripped) return [];
  return stripped
    .split(";")
    .map((part) => {
      const text = part.trim();
      if (!text) return null;
      const idx = text.indexOf(":");
      if (idx === -1) return { path: "(geral)", message: text };
      const path = text.slice(0, idx).trim() || "(raiz)";
      const message = text.slice(idx + 1).trim();
      return { path, message };
    })
    .filter((x): x is { path: string; message: string } => x !== null);
}

function AdminIntegrationsPage() {
  const { t } = useI18n();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [perfectpayToken, setPerfectpayToken] = useState("");
  const [perfectpayTokenSaved, setPerfectpayTokenSaved] = useState("");
  const [perfectpayTokenSavedAt, setPerfectpayTokenSavedAt] = useState<string | null>(null);
  const [savingPerfectpay, setSavingPerfectpay] = useState(false);
  const [removingPerfectpay, setRemovingPerfectpay] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{
    status: number;
    ok: boolean;
    body: string;
    ranAt: string;
    usedToken: boolean;
  } | null>(null);
  const [replayingWebhook, setReplayingWebhook] = useState(false);
  const [webhookReplayResult, setWebhookReplayResult] = useState<{
    status: number;
    ok: boolean;
    body: string;
    ranAt: string;
    sourceReceivedAt: string | null;
    sourceEventType: string | null;
  } | null>(null);
  const [invalidEvents, setInvalidEvents] = useState<
    Array<{
      id: string;
      received_at: string;
      event_type: string | null;
      error_message: string | null;
      payload: any;
    }>
  >([]);
  const [loadingInvalidEvents, setLoadingInvalidEvents] = useState(false);
  const [selectedInvalidEventId, setSelectedInvalidEventId] = useState<string | null>(null);

  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/perfectpay/webhook`);
  }, []);
  useEffect(() => {
    void loadPerfectpayToken();
  }, []);
  useEffect(() => {
    void loadInvalidWebhookEvents();
  }, []);

  async function loadInvalidWebhookEvents() {
    setLoadingInvalidEvents(true);
    const { data, error } = await (supabase as any)
      .from("webhook_events")
      .select("id, received_at, event_type, error_message, payload")
      .eq("provider", "perfectpay")
      .eq("processed", false)
      .in("event_type", ["invalid_payload", "invalid_token"])
      .order("received_at", { ascending: false })
      .limit(20);
    setLoadingInvalidEvents(false);
    if (error) {
      toast.error("Não foi possível carregar eventos inválidos", { description: error.message });
      return;
    }
    setInvalidEvents((data ?? []) as any[]);
  }

  async function loadPerfectpayToken() {
    const { data, error } = await (supabase as any)
      .from("webhook_integrations")
      .select("signing_secret, updated_at")
      .eq("provider", "perfectpay")
      .maybeSingle();
    if (error) return;
    const token = (data?.signing_secret ?? "") as string;
    setPerfectpayToken(token);
    setPerfectpayTokenSaved(token);
    setPerfectpayTokenSavedAt(token ? ((data?.updated_at as string | null) ?? null) : null);
  }

  async function savePerfectpayToken() {
    const value = perfectpayToken.trim();
    setSavingPerfectpay(true);
    const { data, error } = await (supabase as any)
      .from("webhook_integrations")
      .update({ signing_secret: value || null, active: !!value })
      .eq("provider", "perfectpay")
      .select("updated_at")
      .maybeSingle();
    setSavingPerfectpay(false);
    if (error)
      return toast.error("Não foi possível salvar o token", { description: error.message });
    setPerfectpayTokenSaved(value);
    setPerfectpayTokenSavedAt(
      value ? ((data?.updated_at as string | null) ?? new Date().toISOString()) : null,
    );
    toast.success(value ? "Token PerfectPay salvo" : "Token PerfectPay removido");
  }

  async function removePerfectpayToken() {
    setRemovingPerfectpay(true);
    const { error } = await (supabase as any)
      .from("webhook_integrations")
      .update({ signing_secret: null, active: false })
      .eq("provider", "perfectpay");
    setRemovingPerfectpay(false);
    if (error)
      return toast.error("Não foi possível remover o token", { description: error.message });
    setPerfectpayToken("");
    setPerfectpayTokenSaved("");
    setPerfectpayTokenSavedAt(null);
    setRemoveDialogOpen(false);
    toast.success("Token removido — webhooks PerfectPay aceitos sem validação");
  }

  async function testPerfectpayWebhook() {
    setTestingWebhook(true);
    setWebhookTestResult(null);
    const usedToken = !!perfectpayTokenSaved;
    const samplePayload = {
      token: perfectpayTokenSaved || "test-token",
      code: `PPCPMTBTEST${Date.now()}`,
      sale_amount: 0.0,
      currency_enum: 1,
      coupon_code: null,
      installments: 1,
      installment_amount: 0.0,
      shipping_type_enum: 1,
      shipping_amount: null,
      payment_method_enum: 0,
      payment_type_enum: 0,
      billet_url: "",
      billet_number: null,
      billet_expiration: null,
      quantity: 1,
      sale_status_enum: 2,
      sale_status_detail: "approved (teste)",
      date_created: new Date().toISOString().replace("T", " ").slice(0, 19),
      date_approved: new Date().toISOString().replace("T", " ").slice(0, 19),
      product: {
        code: "PPPBTEST",
        name: "Produto de teste",
        external_reference: "test-ref",
        guarantee: 7,
      },
      plan: { code: "PPLTEST", name: "Plano de teste", quantity: 1 },
      plan_itens: [],
      customer: {
        customer_type_enum: 1,
        full_name: "Cliente de Teste",
        email: "teste@perfectpay.example",
        identification_type: "CPF",
        identification_number: "00000000000",
      },
      metadata: { src: "admin_test_webhook" },
      webhook_owner: "PPADMIN",
      commission: [],
      marketplaces: {},
    };
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(usedToken ? { "x-perfectpay-token": perfectpayTokenSaved } : {}),
        },
        body: JSON.stringify(samplePayload),
      });
      const body = await res.text();
      setWebhookTestResult({
        status: res.status,
        ok: res.ok,
        body: body.slice(0, 500),
        ranAt: new Date().toISOString(),
        usedToken,
      });
      if (res.ok) toast.success(`Webhook respondeu ${res.status} OK`);
      else toast.error(`Webhook respondeu ${res.status}`);
    } catch (err: any) {
      setWebhookTestResult({
        status: 0,
        ok: false,
        body: err?.message ?? "Falha de rede",
        ranAt: new Date().toISOString(),
        usedToken,
      });
      toast.error("Não foi possível alcançar o webhook");
    } finally {
      setTestingWebhook(false);
    }
  }

  async function replayLastPerfectpayPayload() {
    setReplayingWebhook(true);
    setWebhookReplayResult(null);
    try {
      const { data: lastEvent, error } = await (supabase as any)
        .from("webhook_events")
        .select("payload, received_at, event_type")
        .eq("provider", "perfectpay")
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        toast.error("Não foi possível buscar o último payload", { description: error.message });
        return;
      }
      if (!lastEvent?.payload) {
        toast.error("Nenhum payload da PerfectPay foi recebido ainda");
        return;
      }
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lastEvent.payload),
      });
      const body = await res.text();
      setWebhookReplayResult({
        status: res.status,
        ok: res.ok,
        body: body.slice(0, 500),
        ranAt: new Date().toISOString(),
        sourceReceivedAt: (lastEvent.received_at as string | null) ?? null,
        sourceEventType: (lastEvent.event_type as string | null) ?? null,
      });
      if (res.ok) toast.success(`Reenvio respondeu ${res.status} OK`);
      else toast.error(`Reenvio respondeu ${res.status}`);
    } catch (err: any) {
      setWebhookReplayResult({
        status: 0,
        ok: false,
        body: err?.message ?? "Falha de rede",
        ranAt: new Date().toISOString(),
        sourceReceivedAt: null,
        sourceEventType: null,
      });
      toast.error("Não foi possível reenviar o payload");
    } finally {
      setReplayingWebhook(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card/70 p-6 shadow-cinematic backdrop-blur-xl sm:p-7">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">{t("admin")}</p>
        <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
          Integrações
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Conecte serviços externos para automatizar vendas, ativações e cancelamentos.
        </p>
      </section>

      <div className="rounded-3xl border border-border bg-card/85 p-5 shadow-card backdrop-blur-xl">
        <h2 className="font-display text-lg font-extrabold text-foreground">
          {t("perfectPayIntegration")}
        </h2>
        <div className="mt-4 space-y-5">
          {/* Status visual + aviso de segurança */}
          {perfectpayTokenSaved ? (
            <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-0.5 text-xs">
                <p className="font-extrabold text-foreground">
                  Endpoint protegido — Token configurado
                </p>
                <p className="text-muted-foreground">
                  Apenas requisições com o Public token correto serão aceitas.
                </p>
                {perfectpayTokenSavedAt ? (
                  <p className="text-[11px] text-muted-foreground">
                    Salvo em{" "}
                    <span className="font-bold text-foreground">
                      {new Date(perfectpayTokenSavedAt).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div className="space-y-0.5 text-xs">
                <p className="font-extrabold text-destructive">
                  Endpoint desprotegido — Token não configurado
                </p>
                <p className="text-muted-foreground">
                  Qualquer pessoa com a URL do webhook pode enviar eventos falsos. Configure o
                  Public token da PerfectPay abaixo para validar a origem.
                </p>
              </div>
            </div>
          )}

          {/* Passo 1 — webhook URL */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-extrabold text-primary">
                1
              </span>
              <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                URL do Webhook (cole na PerfectPay)
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground break-all">
              {webhookUrl}
            </div>
            <button
              type="button"
              onClick={() =>
                navigator.clipboard
                  .writeText(webhookUrl)
                  .then(() => toast.success("Webhook copiado"))
              }
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-display text-sm font-bold text-primary-foreground"
            >
              <PlugZap className="h-4 w-4" /> {t("copyWebhook")}
            </button>
          </div>

          <div className="h-px bg-border" />

          {/* Passo 2 — token */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-extrabold text-primary">
                2
              </span>
              <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                Token público da PerfectPay
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Na PerfectPay (tela do webhook), copie o campo{" "}
              <strong className="text-foreground">Public token</strong> e cole abaixo. Ele garante
              que só os webhooks vindos da sua conta PerfectPay sejam aceitos.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={perfectpayToken}
                onChange={(e) => setPerfectpayToken(e.target.value)}
                placeholder="Ex.: d13f0cafd9470cef9eabe6c3ac94534d"
                className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={savePerfectpayToken}
                disabled={savingPerfectpay || perfectpayToken.trim() === perfectpayTokenSaved}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 font-display text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                <ShieldCheck className="h-4 w-4" />
                {savingPerfectpay ? t("saving") : "Salvar token"}
              </button>
            </div>
            {perfectpayTokenSaved ? (
              <div className="flex justify-end">
                <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-transparent px-4 py-2 text-xs font-bold text-destructive transition hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remover token
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <ShieldOff className="h-5 w-5" />
                        Remover token e desativar validação?
                      </AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="space-y-3 text-sm">
                          <p>
                            Ao remover o Public token, o endpoint do webhook ficará{" "}
                            <strong className="text-foreground">aberto</strong> e passará a aceitar
                            requisições sem nenhuma validação de origem.
                          </p>
                          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-foreground">
                            <p className="mb-1 font-extrabold text-destructive">
                              Impacto desta ação:
                            </p>
                            <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                              <li>
                                Qualquer pessoa com a URL pode disparar eventos de venda falsos.
                              </li>
                              <li>
                                Compras aprovadas, cancelamentos e reembolsos podem ser forjados.
                              </li>
                              <li>Usuários podem ser ativados ou desativados indevidamente.</li>
                            </ul>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Use somente se você precisa testar a integração ou trocar o token. Você
                            pode salvar um novo token a qualquer momento.
                          </p>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={removingPerfectpay}>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault();
                          void removePerfectpayToken();
                        }}
                        disabled={removingPerfectpay}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {removingPerfectpay ? "Removendo..." : "Sim, remover token"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : null}
            {perfectpayTokenSaved ? (
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Token ativo — webhooks PerfectPay serão
                  validados.
                </p>
                {perfectpayTokenSavedAt ? (
                  <p className="text-[11px] text-muted-foreground">
                    Última atualização:{" "}
                    <span className="font-bold text-foreground">
                      {new Date(perfectpayTokenSavedAt).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" /> Sem token configurado — recomendamos
                salvar para validar a origem dos webhooks.
              </p>
            )}
          </div>

          <div className="h-px bg-border" />

          {/* Passo 3 — testar */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-extrabold text-primary">
                3
              </span>
              <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                Testar integração
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Envia um evento de exemplo para a sua URL acima usando o token configurado. O
              resultado da chamada (status HTTP) aparece abaixo.
            </p>
            <button
              type="button"
              onClick={testPerfectpayWebhook}
              disabled={testingWebhook}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 py-2.5 font-display text-sm font-bold text-primary transition hover:bg-primary/20 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {testingWebhook ? "Enviando..." : "Testar webhook"}
            </button>

            {webhookTestResult ? (
              <div
                className={`mt-2 space-y-2 rounded-2xl border p-3 text-xs ${
                  webhookTestResult.ok
                    ? "border-primary/30 bg-primary/10"
                    : "border-destructive/40 bg-destructive/10"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {webhookTestResult.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span
                    className={`font-display text-sm font-extrabold ${webhookTestResult.ok ? "text-primary" : "text-destructive"}`}
                  >
                    {webhookTestResult.status === 0
                      ? "Falha de rede"
                      : `HTTP ${webhookTestResult.status}`}
                  </span>
                  <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {webhookTestResult.usedToken ? "com token" : "sem token"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(webhookTestResult.ranAt).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {webhookTestResult.status === 200 || webhookTestResult.status === 201
                    ? "Webhook recebido e processado com sucesso pela sua API."
                    : webhookTestResult.status === 401
                      ? "Token inválido ou ausente — a validação está funcionando corretamente."
                      : webhookTestResult.status === 0
                        ? "Não foi possível alcançar a URL. Verifique se o endpoint está publicado."
                        : "Resposta inesperada do servidor. Veja o corpo abaixo para detalhes."}
                </p>
                {webhookTestResult.body ? (
                  <pre className="max-h-40 overflow-auto rounded-lg border border-border bg-background p-2 font-mono text-[11px] text-foreground">
                    {webhookTestResult.body}
                  </pre>
                ) : null}
              </div>
            ) : null}

            <div className="mt-3 space-y-2 rounded-2xl border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Reenviar último payload recebido
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Busca o último evento real registrado em{" "}
                <span className="font-mono">webhook_events</span> e o reenvia para a sua URL — útil
                para validar se a checagem retorna 200 ou 400.
              </p>
              <button
                type="button"
                onClick={replayLastPerfectpayPayload}
                disabled={replayingWebhook}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 font-display text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-60"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {replayingWebhook ? "Reenviando..." : "Reenviar último payload"}
              </button>

              {webhookReplayResult ? (
                <div
                  className={`mt-2 space-y-2 rounded-2xl border p-3 text-xs ${
                    webhookReplayResult.ok
                      ? "border-primary/30 bg-primary/10"
                      : "border-destructive/40 bg-destructive/10"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {webhookReplayResult.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span
                      className={`font-display text-sm font-extrabold ${webhookReplayResult.ok ? "text-primary" : "text-destructive"}`}
                    >
                      {webhookReplayResult.status === 0
                        ? "Falha de rede"
                        : `HTTP ${webhookReplayResult.status}`}
                    </span>
                    {webhookReplayResult.sourceEventType ? (
                      <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {webhookReplayResult.sourceEventType}
                      </span>
                    ) : null}
                    <span className="text-[11px] text-muted-foreground">
                      Reenviado{" "}
                      {new Date(webhookReplayResult.ranAt).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  {webhookReplayResult.sourceReceivedAt ? (
                    <p className="text-[11px] text-muted-foreground">
                      Payload original recebido em{" "}
                      <span className="font-bold text-foreground">
                        {new Date(webhookReplayResult.sourceReceivedAt).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })}
                      </span>
                    </p>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground">
                    {webhookReplayResult.status === 200 || webhookReplayResult.status === 201
                      ? "Validação aprovou o payload reenviado (200 OK)."
                      : webhookReplayResult.status === 400
                        ? "Validação rejeitou o payload por campos inválidos/ausentes (400)."
                        : webhookReplayResult.status === 401
                          ? "Token inválido — a validação de origem está funcionando."
                          : webhookReplayResult.status === 0
                            ? "Não foi possível alcançar a URL. Verifique se o endpoint está publicado."
                            : "Resposta inesperada — veja o corpo abaixo."}
                  </p>
                  {webhookReplayResult.body ? (
                    <pre className="max-h-40 overflow-auto rounded-lg border border-border bg-background p-2 font-mono text-[11px] text-foreground">
                      {webhookReplayResult.body}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Passo 4 — eventos invalidados */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/15 text-[11px] font-extrabold text-destructive">
                  4
                </span>
                <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                  Webhooks invalidados
                </p>
              </div>
              <button
                type="button"
                onClick={loadInvalidWebhookEvents}
                disabled={loadingInvalidEvents}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-bold text-muted-foreground transition hover:bg-muted disabled:opacity-60"
              >
                <RotateCcw className="h-3 w-3" />
                {loadingInvalidEvents ? "Atualizando..." : "Atualizar"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Últimos eventos rejeitados pela validação. Selecione um para ver quais campos faltaram
              ou vieram inválidos.
            </p>

            {invalidEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                {loadingInvalidEvents
                  ? "Carregando..."
                  : "Nenhum webhook invalidado nos últimos eventos."}
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <ul className="space-y-1.5 max-h-72 overflow-auto pr-1">
                  {invalidEvents.map((evt) => {
                    const isSelected = evt.id === selectedInvalidEventId;
                    const isToken = evt.event_type === "invalid_token";
                    return (
                      <li key={evt.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedInvalidEventId(isSelected ? null : evt.id)}
                          className={`w-full rounded-xl border p-2.5 text-left text-xs transition ${
                            isSelected
                              ? "border-destructive/60 bg-destructive/10"
                              : "border-border bg-background hover:border-destructive/40 hover:bg-destructive/5"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 font-display font-extrabold text-foreground">
                              {isToken ? (
                                <ShieldOff className="h-3.5 w-3.5 text-destructive" />
                              ) : (
                                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                              )}
                              {isToken ? "Token inválido" : "Payload inválido"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(evt.received_at).toLocaleString("pt-BR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                            {evt.error_message ?? "Sem mensagem de erro registrada."}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div className="rounded-2xl border border-border bg-background p-3">
                  {(() => {
                    const selected = invalidEvents.find((e) => e.id === selectedInvalidEventId);
                    if (!selected) {
                      return (
                        <p className="py-6 text-center text-xs text-muted-foreground">
                          Selecione um evento à esquerda para ver os detalhes.
                        </p>
                      );
                    }
                    const issues = parseValidationIssues(selected.error_message);
                    const isToken = selected.event_type === "invalid_token";
                    return (
                      <div className="space-y-3">
                        <div>
                          <p className="font-display text-sm font-extrabold text-foreground">
                            {isToken
                              ? "Token inválido ou ausente"
                              : "Campos rejeitados pela validação"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Recebido em{" "}
                            <span className="font-bold text-foreground">
                              {new Date(selected.received_at).toLocaleString("pt-BR", {
                                dateStyle: "short",
                                timeStyle: "medium",
                              })}
                            </span>
                          </p>
                        </div>

                        {isToken ? (
                          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-foreground">
                            O webhook foi rejeitado porque o token enviado pela PerfectPay não
                            confere com o token configurado aqui (passo 2). Verifique se o mesmo
                            valor está cadastrado nos dois lados.
                          </div>
                        ) : issues.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Sem detalhamento Zod disponível. Mensagem original:{" "}
                            <span className="font-mono">{selected.error_message ?? "—"}</span>
                          </p>
                        ) : (
                          <ul className="divide-y divide-border rounded-xl border border-border">
                            {issues.map((issue, idx) => (
                              <li
                                key={`${issue.path}-${idx}`}
                                className="flex flex-col gap-0.5 p-2.5"
                              >
                                <span className="font-mono text-[11px] font-bold text-destructive">
                                  {issue.path}
                                </span>
                                <span className="text-xs text-foreground">{issue.message}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        <details className="group rounded-xl border border-border bg-muted/20 p-2 text-[11px]">
                          <summary className="cursor-pointer font-bold text-muted-foreground group-open:text-foreground">
                            Ver payload recebido
                          </summary>
                          <pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-border bg-background p-2 font-mono text-[10px] text-foreground">
                            {JSON.stringify(selected.payload, null, 2)}
                          </pre>
                        </details>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
