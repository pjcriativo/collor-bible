import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Loader2,
  Save,
  Mail,
  Eye,
  Code2,
  AtSign,
  Info,
  Send,
  X,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/emails")({
  component: AdminEmailsPage,
});

// Templates que recebem o reply-to do e-mail principal automaticamente.
// Casamento por substring no template_key — cobre variações como
// "purchase_approved", "compra_aprovada", "password_reset", "recovery", etc.
const AUTO_REPLY_TO_KEYS = [
  "purchase",
  "compra",
  "approved",
  "aprovad",
  "password",
  "senha",
  "reset",
  "recover",
];

function usesAutoReplyTo(templateKey: string | undefined | null): boolean {
  if (!templateKey) return false;
  const key = templateKey.toLowerCase();
  return AUTO_REPLY_TO_KEYS.some((needle) => key.includes(needle));
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SenderStatus = "empty" | "invalid" | "valid";

function getSenderStatus(email: string): SenderStatus {
  const trimmed = email.trim();
  if (!trimmed) return "empty";
  if (!EMAIL_REGEX.test(trimmed)) return "invalid";
  return "valid";
}

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  body_html: string;
  variables: string[];
  enabled: boolean;
}

interface SenderSettings {
  id: string | null;
  sender_email: string;
  sender_name: string;
}

function AdminEmailsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"editor" | "preview">("editor");
  const [sender, setSender] = useState<SenderSettings>({
    id: null,
    sender_email: "",
    sender_name: "",
  });
  const [savingSender, setSavingSender] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testCc, setTestCc] = useState("");
  const [testBcc, setTestBcc] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    void load();
    void loadSender();
  }, []);

  async function loadSender() {
    const { data, error } = await (supabase as any)
      .from("app_settings")
      .select("id, sender_email, sender_name")
      .limit(1)
      .maybeSingle();
    if (error) {
      toast.error("Erro ao carregar e-mail remetente", { description: error.message });
      return;
    }
    if (data) {
      setSender({
        id: data.id,
        sender_email: data.sender_email ?? "",
        sender_name: data.sender_name ?? "",
      });
    }
  }

  async function handleSaveSender() {
    if (!sender.id) {
      toast.error("Configurações não encontradas");
      return;
    }
    const email = sender.sender_email.trim();
    if (!email) {
      toast.error("E-mail principal obrigatório", {
        description: "Sem ele, compras aprovadas e recuperação de senha ficam bloqueadas.",
      });
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      toast.error("E-mail inválido", { description: "Use o formato nome@dominio.com" });
      return;
    }
    setSavingSender(true);
    const { error } = await (supabase as any)
      .from("app_settings")
      .update({
        sender_email: email,
        sender_name: sender.sender_name.trim() || null,
      })
      .eq("id", sender.id);
    setSavingSender(false);
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
    } else {
      toast.success("E-mail principal salvo — disparos liberados!", {
        description: "Compra aprovada e recuperação de senha já podem ser enviados.",
      });
    }
  }

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("email_templates")
      .select("id, template_key, name, subject, body_html, variables, enabled")
      .order("template_key");
    if (error) {
      toast.error("Erro ao carregar templates", { description: error.message });
    } else {
      const list = (data ?? []).map((t: any) => ({
        ...t,
        variables: Array.isArray(t.variables) ? t.variables : [],
      })) as EmailTemplate[];
      setTemplates(list);
      if (!activeKey && list[0]) setActiveKey(list[0].template_key);
    }
    setLoading(false);
  }

  const active = templates.find((t) => t.template_key === activeKey) ?? null;

  function update<K extends keyof EmailTemplate>(key: K, value: EmailTemplate[K]) {
    if (!active) return;
    setTemplates((prev) =>
      prev.map((t) => (t.template_key === active.template_key ? { ...t, [key]: value } : t)),
    );
  }

  async function handleSave() {
    if (!active) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("email_templates")
      .update({
        name: active.name,
        subject: active.subject,
        body_html: active.body_html,
        enabled: active.enabled,
      })
      .eq("id", active.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
    } else {
      toast.success("Template salvo!", { description: "As mudanças já estão valendo." });
    }
  }

  function renderPreview(html: string) {
    if (!active) return html;
    let rendered = html;
    const sample: Record<string, string> = {
      name: "Maria",
      email: "maria@exemplo.com",
      login_url: "https://reinodascores.app/login",
      reset_url: "https://reinodascores.app/recuperar?token=demo",
    };
    for (const v of active.variables) {
      rendered = rendered.replaceAll(`{{${v}}}`, sample[v] ?? `[${v}]`);
    }
    return rendered;
  }

  function parseAddressList(raw: string): { valid: string[]; invalid: string[] } {
    const items = raw
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const valid: string[] = [];
    const invalid: string[] = [];
    for (const item of items) {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)) valid.push(item);
      else invalid.push(item);
    }
    return { valid, invalid };
  }

  function handleSendTest() {
    if (!active) return;
    const to = testEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      toast.error("E-mail inválido", { description: "Use o formato nome@dominio.com" });
      return;
    }
    const cc = parseAddressList(testCc);
    const bcc = parseAddressList(testBcc);
    if (cc.invalid.length) {
      toast.error("CC com endereço inválido", { description: cc.invalid.join(", ") });
      return;
    }
    if (bcc.invalid.length) {
      toast.error("BCC com endereço inválido", { description: bcc.invalid.join(", ") });
      return;
    }
    setTesting(true);
    try {
      const replyTo = sender.sender_email.trim();
      const senderName = sender.sender_name.trim() || "Reino das Cores";
      const renderedHtml = renderPreview(active.body_html);

      const headerNote = `[TESTE] Enviado por ${senderName}${replyTo ? ` <${replyTo}>` : ""} • Template: ${active.template_key}`;
      const bodyText =
        `${headerNote}\n\n` +
        `--- Pré-visualização (HTML será renderizado pelo cliente de e-mail) ---\n\n` +
        renderedHtml;

      const params = new URLSearchParams({
        subject: `[TESTE] ${active.subject}`,
        body: bodyText,
      });
      const ccList = [...cc.valid];
      if (replyTo && !ccList.includes(replyTo) && replyTo !== to) ccList.push(replyTo);
      if (ccList.length) params.set("cc", ccList.join(","));
      if (bcc.valid.length) params.set("bcc", bcc.valid.join(","));

      const mailto = `mailto:${encodeURIComponent(to)}?${params.toString()}`;
      window.location.href = mailto;

      const totalRecipients = 1 + cc.valid.length + bcc.valid.length;
      toast.success("Abrindo seu cliente de e-mail", {
        description: `Mensagem pronta para ${totalRecipients} destinatário${totalRecipients > 1 ? "s" : ""} (${to}${cc.valid.length ? ` • CC: ${cc.valid.length}` : ""}${bcc.valid.length ? ` • BCC: ${bcc.valid.length}` : ""}).`,
      });
      setTestOpen(false);
    } catch (err) {
      toast.error("Não foi possível abrir o cliente de e-mail", {
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-soft">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">E-mails</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-foreground">
          Templates de envio
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edite os modelos visuais usados nos e-mails de acesso à conta e recuperação de senha.
        </p>
      </header>

      {/* Aviso global — bloqueia disparos automáticos quando inválido */}
      {(() => {
        const status = getSenderStatus(sender.sender_email);
        if (status === "valid") return null;
        return (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-3xl border border-destructive/40 bg-destructive/10 p-5 shadow-soft"
          >
            <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-destructive" />
            <div className="flex-1 space-y-1">
              <p className="font-display text-base font-extrabold text-foreground">
                Disparos automáticos bloqueados
              </p>
              <p className="text-sm text-muted-foreground">
                {status === "empty"
                  ? "Você ainda não definiu o e-mail principal da plataforma. Sem ele, os e-mails de "
                  : "O e-mail principal informado é inválido. Sem um endereço válido, os e-mails de "}
                <strong className="text-foreground">compra aprovada</strong> e{" "}
                <strong className="text-foreground">recuperação de senha</strong> não serão enviados
                aos clientes. Corrija no campo abaixo e salve para liberar os disparos.
              </p>
            </div>
          </div>
        );
      })()}

      {/* E-mail principal da plataforma */}
      <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/80 to-card/80 p-6 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <AtSign className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
              E-mail principal da plataforma
            </p>
            <h2 className="font-display text-xl font-extrabold text-foreground">
              Endereço de contato e resposta
            </h2>
            <p className="text-sm text-muted-foreground">
              Este é o e-mail oficial da plataforma. Os clientes verão este endereço como{" "}
              <strong className="text-foreground">remetente / contato</strong> nos e-mails de{" "}
              <strong className="text-foreground">compra aprovada</strong> e{" "}
              <strong className="text-foreground">recuperação de senha</strong>. Quando o cliente
              responder, a mensagem chegará neste endereço.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-bold text-foreground">Nome do remetente</label>
            <input
              type="text"
              value={sender.sender_name}
              onChange={(e) => setSender((s) => ({ ...s, sender_name: e.target.value }))}
              placeholder="Reino das Cores"
              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Aparece no campo "De" da caixa de entrada do cliente.
            </p>
          </div>
          <div>
            <label className="text-sm font-bold text-foreground">E-mail principal</label>
            <input
              type="email"
              value={sender.sender_email}
              onChange={(e) => setSender((s) => ({ ...s, sender_email: e.target.value }))}
              placeholder="contato.seuemail@gmail.com"
              aria-invalid={getSenderStatus(sender.sender_email) !== "valid"}
              className={cn(
                "mt-2 w-full rounded-2xl border bg-background px-4 py-3 text-sm text-foreground focus:outline-none",
                getSenderStatus(sender.sender_email) === "valid"
                  ? "border-border focus:border-primary"
                  : "border-destructive/60 focus:border-destructive",
              )}
            />
            {(() => {
              const status = getSenderStatus(sender.sender_email);
              if (status === "valid") {
                return (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" /> E-mail válido — disparos liberados.
                  </p>
                );
              }
              return (
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {status === "empty"
                    ? "Obrigatório. Preencha para liberar os disparos automáticos."
                    : "Formato inválido. Use nome@dominio.com."}
                </p>
              );
            })()}
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-primary/20 bg-background/60 p-3 text-[12px] text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Os disparos são feitos pela infraestrutura de e-mails da plataforma. Este endereço é
            usado como <strong className="text-foreground">contato visível</strong> e{" "}
            <strong className="text-foreground">resposta (reply-to)</strong>, garantindo que toda
            interação do cliente caia direto na sua caixa de entrada.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              const status = getSenderStatus(sender.sender_email);
              if (status !== "valid") {
                toast.error("Defina um e-mail principal válido", {
                  description: "Sem ele, o teste não pode usar o reply-to da plataforma.",
                });
                return;
              }
              const target = templates.find((t) => t.enabled) ?? templates[0] ?? null;
              if (!target) {
                toast.error("Nenhum template disponível", {
                  description: "Cadastre ou ative ao menos um template para testar.",
                });
                return;
              }
              setActiveKey(target.template_key);
              setTestEmail("");
              setTestCc("");
              setTestBcc("");
              setTestOpen(true);
            }}
            className="flex items-center gap-2 rounded-full border border-primary/40 bg-background px-5 py-2.5 font-display text-sm font-bold text-primary transition hover:bg-primary/10"
          >
            <Send className="h-4 w-4" />
            Enviar e-mail de teste
          </button>
          <button
            type="button"
            onClick={handleSaveSender}
            disabled={savingSender}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-display text-sm font-bold text-primary-foreground shadow-glow-gold transition hover:scale-[1.01] disabled:opacity-60"
          >
            {savingSender ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar e-mail principal
          </button>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando templates...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Lista — 2 colunas (50% cada) na mesma linha */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {templates.map((t) => (
              <button
                key={t.template_key}
                type="button"
                onClick={() => setActiveKey(t.template_key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition",
                  activeKey === t.template_key
                    ? "border-primary bg-primary/10 text-foreground shadow-glow-gold"
                    : "border-border/60 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                <Mail className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="font-display text-sm font-extrabold leading-tight">{t.name}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide opacity-70">
                    {t.template_key}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Editor */}
          {active ? (
            <section className="space-y-4 rounded-3xl border border-border/60 bg-card/80 p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    {active.template_key}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-extrabold text-foreground">
                    {active.name}
                  </h2>
                </div>
                <div className="flex gap-2 rounded-full border border-border/60 bg-background p-1">
                  {(["editor", "preview"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setView(v)}
                      className={cn(
                        "flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition",
                        view === v
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {v === "editor" ? (
                        <Code2 className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      {v === "editor" ? "Editor" : "Pré-visualizar"}
                    </button>
                  ))}
                </div>
              </div>

              {usesAutoReplyTo(active.template_key) &&
                (() => {
                  const status = getSenderStatus(sender.sender_email);
                  const blocked = status !== "valid";
                  return (
                    <div
                      className={cn(
                        "flex items-start gap-3 rounded-2xl border p-4 text-[12px]",
                        blocked
                          ? "border-destructive/40 bg-destructive/10"
                          : "border-primary/40 bg-primary/10",
                      )}
                    >
                      {blocked ? (
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      )}
                      <div className="space-y-1">
                        <p className="font-bold text-foreground">
                          {blocked
                            ? "Disparos automáticos deste template estão bloqueados"
                            : "Reply-to automático ativado neste template"}
                        </p>
                        <p className="text-muted-foreground">
                          {blocked ? (
                            <>
                              Defina um{" "}
                              <strong className="text-foreground">e-mail principal válido</strong>{" "}
                              no card acima para liberar o envio automático de{" "}
                              <strong className="text-foreground">compra aprovada</strong> e{" "}
                              <strong className="text-foreground">recuperação de senha</strong>.
                              Enquanto estiver {status === "empty" ? "vazio" : "inválido"}, este
                              template{" "}
                              <strong className="text-foreground">não será disparado</strong>.
                            </>
                          ) : (
                            <>
                              Todo disparo deste e-mail usa{" "}
                              <strong className="text-foreground">{sender.sender_email}</strong>{" "}
                              como endereço de resposta — sem precisar configurar manualmente.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })()}

              <div>
                <label className="text-sm font-bold text-foreground">Nome interno</label>
                <input
                  type="text"
                  value={active.name}
                  onChange={(e) => update("name", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-foreground">Assunto</label>
                <input
                  type="text"
                  value={active.subject}
                  onChange={(e) => update("subject", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-foreground">
                    Corpo do e-mail (HTML)
                  </label>
                  {active.variables.length > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      Variáveis disponíveis:{" "}
                      {active.variables.map((v) => (
                        <code
                          key={v}
                          className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-primary"
                        >{`{{${v}}}`}</code>
                      ))}
                    </span>
                  )}
                </div>

                {view === "editor" ? (
                  <textarea
                    value={active.body_html}
                    onChange={(e) => update("body_html", e.target.value)}
                    rows={18}
                    className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                ) : (
                  <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-white">
                    <iframe
                      title="Pré-visualização do e-mail"
                      className="h-[480px] w-full"
                      srcDoc={renderPreview(active.body_html)}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={active.enabled}
                    onChange={(e) => update("enabled", e.target.checked)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                  <span className="font-bold text-foreground">Template ativo</span>
                </label>
                <div className="flex items-center gap-3">
                  {(() => {
                    // Mostra "Testar envio" para qualquer template.
                    // Bloqueia apenas quando o template usa reply-to automático
                    // (compra/senha) e o e-mail principal não está válido — pois
                    // nesse caso o disparo real também estaria bloqueado.
                    const requiresReplyTo = usesAutoReplyTo(active.template_key);
                    const senderValid = getSenderStatus(sender.sender_email) === "valid";
                    const senderBlocked = requiresReplyTo && !senderValid;
                    return (
                      <button
                        type="button"
                        disabled={senderBlocked}
                        title={
                          senderBlocked
                            ? "Defina um e-mail principal válido para liberar o teste."
                            : "Envia este template para um destinatário, usando o reply-to configurado."
                        }
                        onClick={() => {
                          if (senderBlocked) {
                            toast.error("Disparos bloqueados", {
                              description:
                                "Defina um e-mail principal válido antes de enviar o teste.",
                            });
                            return;
                          }
                          setTestEmail("");
                          setTestCc("");
                          setTestBcc("");
                          setTestOpen(true);
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-full border px-5 py-3 font-display text-sm font-bold transition",
                          senderBlocked
                            ? "cursor-not-allowed border-border bg-muted text-muted-foreground opacity-70"
                            : "border-primary/40 bg-background text-primary hover:bg-primary/10",
                        )}
                      >
                        {senderBlocked ? (
                          <ShieldAlert className="h-4 w-4" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        {senderBlocked ? "Bloqueado" : "Testar envio"}
                      </button>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-display font-bold text-primary-foreground shadow-glow-gold transition hover:scale-[1.01] disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Salvar template
                  </button>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      )}

      {/* Modal de teste de envio */}
      {testOpen && active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setTestOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Teste de envio
                </p>
                <h3 className="mt-1 font-display text-xl font-extrabold text-foreground">
                  Enviar e-mail de teste
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTestOpen(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              Envia o template <strong className="text-foreground">"{active.name}"</strong> para
              qualquer destinatário que você quiser — sem alterar o e-mail principal configurado.
            </p>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-bold text-foreground">E-mail de destino</label>
                {sender.sender_email &&
                  testEmail.trim().toLowerCase() !== sender.sender_email.trim().toLowerCase() && (
                    <button
                      type="button"
                      onClick={() => setTestEmail(sender.sender_email)}
                      className="text-[11px] font-bold uppercase tracking-wider text-primary hover:underline"
                    >
                      Usar e-mail principal
                    </button>
                  )}
              </div>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="outro-email@exemplo.com"
                autoFocus
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Pode ser qualquer endereço — útil para testar entrega em outras caixas (Gmail,
                Outlook, etc).
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-foreground">
                  CC{" "}
                  <span className="text-[11px] font-normal text-muted-foreground">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={testCc}
                  onChange={(e) => setTestCc(e.target.value)}
                  placeholder="cc1@exemplo.com, cc2@exemplo.com"
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Cópia visível. Separe com vírgula.
                </p>
              </div>
              <div>
                <label className="text-sm font-bold text-foreground">
                  BCC{" "}
                  <span className="text-[11px] font-normal text-muted-foreground">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={testBcc}
                  onChange={(e) => setTestBcc(e.target.value)}
                  placeholder="oculto@exemplo.com"
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Cópia oculta. Separe com vírgula.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-1.5 rounded-2xl border border-border/60 bg-background/60 p-3 text-[12px] text-muted-foreground">
              <p className="flex justify-between gap-3">
                <span>De:</span>
                <span className="text-foreground">{sender.sender_name || "Reino das Cores"}</span>
              </p>
              <p className="flex justify-between gap-3">
                <span>Reply-to:</span>
                <span className="text-foreground">
                  {sender.sender_email || "— não configurado —"}
                </span>
              </p>
              <p className="flex justify-between gap-3">
                <span>Assunto:</span>
                <span className="text-foreground">[TESTE] {active.subject}</span>
              </p>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-[11px] text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <p>
                O envio abre o seu cliente de e-mail (Gmail, Outlook, Mail) com a mensagem pronta —
                assim você valida o conteúdo na hora. Quando o domínio de envio da plataforma for
                ativado, esse botão passa a disparar o e-mail real automaticamente.
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTestOpen(false)}
                className="rounded-full border border-border bg-background px-5 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testing}
                className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-display text-sm font-bold text-primary-foreground shadow-glow-gold transition hover:scale-[1.01] disabled:opacity-60"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar teste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
