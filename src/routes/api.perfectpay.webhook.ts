import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const json = (body: unknown, status = 200) => Response.json(body, { status });

// =====================================================================
// Schema oficial PerfectPay (postback/webhook)
// Documentação: https://help.perfectpay.com.br/article/597
// Campos seguem exatamente os nomes enviados pela PerfectPay.
// =====================================================================

// Mapa do sale_status_enum → string legível (sale_status_detail é livre).
export const SALE_STATUS_MAP: Record<number, string> = {
  0: "none",
  1: "pending",
  2: "approved",
  3: "in_process",
  4: "in_mediation",
  5: "rejected",
  6: "cancelled",
  7: "refunded",
  8: "authorized",
  9: "charged_back",
  10: "completed",
  11: "checkout_error",
  12: "precheckout",
  13: "expired",
  16: "in_review",
};

// Aceitamos string OU number nos códigos (a doc diz string, mas alguns campos chegam como int).
const codeLike = z.union([z.string().trim().min(1).max(255), z.number().int()]);
const decimalLike = z
  .union([
    z.number(),
    z
      .string()
      .trim()
      .regex(/^-?\d+(\.\d+)?$/),
  ])
  .nullable()
  .optional();

const PayloadSchema = z
  .object({
    // Identificação obrigatória
    token: z.string().trim().min(1).max(64),
    code: z.string().trim().min(1).max(255),
    sale_status_enum: z.coerce.number().int().min(0).max(99),

    // Valores (todos opcionais — variam por evento)
    sale_amount: decimalLike,
    currency_enum: z.coerce.number().int().optional(),
    coupon_code: z.string().max(255).nullable().optional(),
    installments: z.coerce.number().int().min(0).max(99).nullable().optional(),
    installment_amount: decimalLike,
    shipping_type_enum: z.coerce.number().int().nullable().optional(),
    shipping_amount: decimalLike,
    payment_method_enum: z.coerce.number().int().nullable().optional(),
    payment_type_enum: z.coerce.number().int().nullable().optional(),
    billet_url: z.string().max(500).nullable().optional(),
    billet_number: z.string().max(255).nullable().optional(),
    billet_expiration: z.string().max(64).nullable().optional(),
    quantity: z.coerce.number().int().nullable().optional(),
    sale_status_detail: z.string().max(255).nullable().optional(),
    date_created: z.string().max(64).nullable().optional(),
    date_approved: z.string().max(64).nullable().optional(),

    // Produto
    product: z
      .object({
        code: codeLike.optional(),
        name: z.string().max(255).optional(),
        external_reference: z.string().max(255).nullable().optional(),
        guarantee: z.coerce.number().int().nullable().optional(),
        garantee: z.coerce.number().int().nullable().optional(), // typo histórico da doc
      })
      .passthrough()
      .optional(),

    // Plano
    plan: z
      .object({
        code: codeLike.optional(),
        name: z.string().max(255).optional(),
        quantity: z.coerce.number().int().nullable().optional(),
      })
      .passthrough()
      .optional(),

    plan_itens: z.array(z.any()).optional(),

    // Cliente
    customer: z
      .object({
        customer_type_enum: z.coerce.number().int().optional(),
        full_name: z.string().max(255).optional(),
        email: z.string().max(255).optional(), // PerfectPay às vezes manda e-mail "fake" — não validamos formato estrito
        identification_type: z.string().max(20).nullable().optional(),
        identification_number: z.string().max(45).nullable().optional(),
        birthday: z.string().max(32).nullable().optional(),
        phone_area_code: z.string().max(15).nullable().optional(),
        phone_number: z.string().max(15).nullable().optional(),
        country: z.string().max(20).nullable().optional(),
        state: z.string().max(45).nullable().optional(),
        city: z.string().max(255).nullable().optional(),
        zip_code: z.string().max(50).nullable().optional(),
        street_name: z.string().max(255).nullable().optional(),
        street_number: z.string().max(50).nullable().optional(),
        complement: z.string().max(100).nullable().optional(),
        district: z.string().max(100).nullable().optional(),
      })
      .passthrough()
      .optional(),

    metadata: z.record(z.string(), z.any()).optional(),
    webhook_owner: z.string().max(100).nullable().optional(),
    commission: z.array(z.any()).optional(),
    marketplaces: z.record(z.string(), z.any()).optional(),

    // Subscriptions / assinaturas (eventos Assinatura iniciada/renovada/cancelada/expirada/pendente/trial)
    subscription: z
      .object({
        code: codeLike.optional(),
        status: z.union([z.string(), z.number()]).optional(),
        next_charge_date: z.string().max(64).nullable().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const Route = createFileRoute("/api/perfectpay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !serviceKey) return json({ error: "Backend não configurado" }, 500);
        const admin = createClient(url, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const rawPayload = await request.json().catch(() => null);
        if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
          await admin.from("webhook_events").insert({
            provider: "perfectpay",
            event_type: "invalid_payload",
            external_event_id: crypto.randomUUID(),
            payload: (rawPayload ?? {}) as any,
            processed: false,
            error_message: "Corpo da requisição ausente ou não é um objeto JSON",
          });
          return json({ error: "Payload inválido", details: "JSON object esperado" }, 400);
        }
        const payload = rawPayload as Record<string, any>;

        // Validação do token público da PerfectPay (configurado no admin).
        // PerfectPay envia o token DENTRO do body (campo `token`). Aceitamos também
        // header `x-perfectpay-token` e query string `?token=` para flexibilidade em testes.
        const { data: integration } = await admin
          .from("webhook_integrations")
          .select("signing_secret")
          .eq("provider", "perfectpay")
          .maybeSingle();
        const expectedToken = (integration?.signing_secret ?? "").trim();
        if (expectedToken) {
          const reqUrl = new URL(request.url);
          const provided = (
            request.headers.get("x-perfectpay-token") ??
            request.headers.get("x-public-token") ??
            reqUrl.searchParams.get("token") ??
            (payload && typeof payload === "object" ? (payload as any).token : null) ??
            ""
          )
            .toString()
            .trim();
          if (provided !== expectedToken) {
            await admin.from("webhook_events").insert({
              provider: "perfectpay",
              event_type: "invalid_token",
              external_event_id: crypto.randomUUID(),
              payload,
              processed: false,
              error_message: "Token público inválido ou ausente",
            });
            return json({ error: "Token inválido" }, 401);
          }
        }

        // Validação rígida — exige campos obrigatórios do postback PerfectPay (token, code, sale_status_enum).
        const parsed = PayloadSchema.safeParse(payload);
        if (!parsed.success) {
          const issues = parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          }));
          const summary = issues
            .map((i) => `${i.path}: ${i.message}`)
            .join("; ")
            .slice(0, 500);
          await admin.from("webhook_events").insert({
            provider: "perfectpay",
            event_type: "invalid_payload",
            external_event_id: crypto.randomUUID(),
            payload,
            processed: false,
            error_message: `Validação falhou: ${summary}`,
          });
          return json({ error: "Payload incompleto ou inválido", issues }, 400);
        }

        const data = parsed.data;
        const externalId = String(data.code);
        const statusKey = data.sale_status_enum;
        const statusName =
          SALE_STATUS_MAP[statusKey] ?? data.sale_status_detail ?? `status_${statusKey}`;
        const eventType = statusName;

        // ─────────────────────────────────────────────────────────────
        // Idempotência (regra forte):
        //
        //  • Chave canônica: `${code}:${sale_status_enum}` — a mesma
        //    transação pode receber vários postbacks (ex.: pending →
        //    approved → refunded), por isso o status faz parte da chave.
        //  • Já processado UMA vez com `processed=true` para essa chave?
        //    → NÃO mexemos em `sales` nem em `webhook_integrations`.
        //    → Registramos um novo evento com `event_type="duplicate"`
        //      e `processed=false`, mantendo o `external_event_id`
        //      original sufixado com o id do evento original (para o
        //      admin auditar facilmente quem foi a "primeira" entrada).
        //    → Resposta 200 com `duplicate:true` para a PerfectPay
        //      parar de re-tentar.
        // ─────────────────────────────────────────────────────────────
        const eventDedupeId = `${externalId}:${statusKey}`;
        const { data: existingEvent } = await admin
          .from("webhook_events")
          .select("id, received_at")
          .eq("provider", "perfectpay")
          .eq("external_event_id", eventDedupeId)
          .eq("processed", true)
          .order("received_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (existingEvent) {
          await admin.from("webhook_events").insert({
            provider: "perfectpay",
            event_type: "duplicate",
            // Sufixamos com o id do evento original — assim continuamos
            // respeitando qualquer índice de unicidade que venha a
            // existir em `external_event_id`, mas o admin consegue
            // filtrar todos os duplicados desse postback procurando por
            // `external_event_id LIKE '${eventDedupeId}:dup:%'`.
            external_event_id: `${eventDedupeId}:dup:${existingEvent.id}`,
            payload,
            processed: false,
            error_message: `Duplicate of event ${existingEvent.id} (já processado em ${existingEvent.received_at}).`,
          });
          return json({
            ok: true,
            duplicate: true,
            code: externalId,
            status: statusName,
            status_enum: statusKey,
            original_event_id: existingEvent.id,
          });
        }

        // Primeira vez que vemos este (code, status) — registramos como
        // "âncora" idempotente (`processed=true`) ANTES de mexer em
        // `sales`. Se o `upsert` falhar depois, a próxima tentativa cai
        // no ramo de duplicado — aceitável aqui porque a PerfectPay
        // re-envia agressivamente e o que importa é não dobrar a venda.
        await admin.from("webhook_events").insert({
          provider: "perfectpay",
          event_type: eventType,
          external_event_id: eventDedupeId,
          payload,
          processed: true,
          error_message: null,
        });

        // Valor da venda em centavos (sale_amount é decimal em BRL).
        const saleAmountRaw = data.sale_amount;
        const saleAmount = saleAmountRaw == null ? 0 : Number(saleAmountRaw);
        const amountCents = Number.isFinite(saleAmount) ? Math.round(saleAmount * 100) : 0;

        // Moeda: currency_enum 1 => BRL (default).
        const currency =
          data.currency_enum === 1 || data.currency_enum == null
            ? "BRL"
            : `ENUM_${data.currency_enum}`;

        const customerEmail = data.customer?.email ?? null;
        const customerExternalId = data.customer?.identification_number ?? null;

        await admin.from("sales").upsert(
          {
            provider: "perfectpay",
            external_sale_id: externalId,
            external_customer_id: customerExternalId,
            customer_email: customerEmail,
            event_type: eventType,
            status: statusName,
            amount_cents: amountCents,
            currency,
            raw_payload: payload,
          },
          { onConflict: "external_sale_id" },
        );

        await admin
          .from("webhook_integrations")
          .update({ last_received_at: new Date().toISOString() })
          .eq("provider", "perfectpay");

        return json({
          ok: true,
          duplicate: false,
          code: externalId,
          status: statusName,
          status_enum: statusKey,
        });
      },
    },
  },
});
