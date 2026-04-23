import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook global de branding — busca a logo personalizada definida no admin
 * e mantém atualizado via realtime. Cai para o fallback informado se a
 * tabela ainda não tiver registros (primeiro boot do projeto).
 */
export interface Branding {
  logoUrl: string | null;
  logoAlt: string;
  appName: string;
  faviconUrl: string | null;
}

const DEFAULT_BRANDING: Branding = {
  logoUrl: null,
  logoAlt: "Reino das Cores",
  appName: "Reino das Cores",
  faviconUrl: null,
};

let cached: Branding | null = null;
const subscribers = new Set<(b: Branding) => void>();

async function fetchBranding(): Promise<Branding> {
  const { data } = await (supabase as any)
    .from("branding_settings")
    .select("logo_url, logo_alt, app_name, favicon_url")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return DEFAULT_BRANDING;
  return {
    logoUrl: data.logo_url ?? null,
    logoAlt: data.logo_alt ?? DEFAULT_BRANDING.logoAlt,
    appName: data.app_name ?? DEFAULT_BRANDING.appName,
    faviconUrl: data.favicon_url ?? null,
  };
}

function notify(b: Branding) {
  cached = b;
  subscribers.forEach((cb) => cb(b));
  // Atualiza favicon dinamicamente
  if (typeof document !== "undefined" && b.faviconUrl) {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon'][data-dynamic='1']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.dataset.dynamic = "1";
      document.head.appendChild(link);
    }
    link.href = b.faviconUrl;
  }
}

let initStarted = false;
function ensureInit() {
  if (initStarted || typeof window === "undefined") return;
  initStarted = true;
  void fetchBranding().then(notify);
  const channel = supabase
    .channel("branding-settings")
    .on("postgres_changes", { event: "*", schema: "public", table: "branding_settings" }, () => {
      void fetchBranding().then(notify);
    })
    .subscribe();
  // Cleanup at page unload (best effort)
  window.addEventListener("beforeunload", () => {
    void supabase.removeChannel(channel);
  });
}

export function useBranding(): Branding {
  const [state, setState] = useState<Branding>(cached ?? DEFAULT_BRANDING);
  useEffect(() => {
    ensureInit();
    if (cached) setState(cached);
    const cb = (b: Branding) => setState(b);
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  }, []);
  return state;
}

export function refreshBranding() {
  void fetchBranding().then(notify);
}
