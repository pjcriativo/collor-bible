import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const json = (body: unknown, status = 200) => Response.json(body, { status });
const PAID_STATUSES = new Set(["paid", "approved", "completed"]);

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

export const Route = createFileRoute("/api/profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { userClient, adminClient } = getClients(request.headers.get("authorization"));
          const { data: userData, error } = await userClient.auth.getUser();
          const user = userData.user;
          if (error || !user) throw new Response("Não autorizado", { status: 401 });

          const { data: profile } = await adminClient
            .from("profiles")
            .select("display_name,purchase_email")
            .eq("user_id", user.id)
            .maybeSingle();
          const email = profile?.purchase_email ?? user.email ?? null;
          const { data: subscriptions } = await adminClient
            .from("subscriptions")
            .select(
              "id,status,amount_cents,currency,current_period_end,started_at,plans(name,billing_interval)",
            )
            .or(`user_id.eq.${user.id}${email ? `,customer_email.eq.${email}` : ""}`)
            .order("created_at", { ascending: false })
            .limit(1);
          const { data: sales } = await adminClient
            .from("sales")
            .select("id,status,amount_cents,currency,sold_at,plans(name)")
            .or(`user_id.eq.${user.id}${email ? `,customer_email.eq.${email}` : ""}`)
            .order("sold_at", { ascending: false })
            .limit(12);
          const paidTotalCents = (sales ?? [])
            .filter((sale: any) => PAID_STATUSES.has(String(sale.status).toLowerCase()))
            .reduce((sum: number, sale: any) => sum + Number(sale.amount_cents ?? 0), 0);

          return json({
            email,
            profile: profile ?? null,
            subscription: subscriptions?.[0] ?? null,
            sales: sales ?? [],
            paidTotalCents,
          });
        } catch (error) {
          if (error instanceof Response) return error;
          return json({ error: "Não foi possível carregar seu perfil" }, 500);
        }
      },
    },
  },
});
