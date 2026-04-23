import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Garante que apenas UMA sessão por usuário fique ativa. Quando outro
 * dispositivo entra na mesma conta, a sessão antiga detecta a mudança via
 * realtime e mostra um AVISO PRÉVIO com countdown ao invés de deslogar
 * imediatamente — o usuário pode escolher manter a sessão atual (e expulsar
 * o outro dispositivo) ou sair. Se o tempo expira sem ação, o logout é
 * forçado normalmente.
 */
const ACTIVE_TOKEN_KEY = "rdc.active-session-token";
/**
 * Marca, para o próximo render da tela de login, que o usuário caiu de
 * volta porque a sessão foi tomada por outro dispositivo. A página `/`
 * lê e limpa essa chave para mostrar um banner claro além do toast.
 */
export const SINGLE_SESSION_KICK_KEY = "rdc.single-session-kick";

/** Janela de graça (segundos) antes do logout automático. */
const GRACE_PERIOD_SECONDS = 30;

function generateToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Tenta extrair um rótulo amigável do user agent — ex.: "iPhone · Safari".
 * Não é exaustivo; serve apenas para dar contexto visual ao usuário no
 * diálogo de aviso. Se nada bater, devolve a versão truncada do UA.
 */
function summarizeUserAgent(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const lower = ua.toLowerCase();
  let device: string | null = null;
  if (/iphone/.test(lower)) device = "iPhone";
  else if (/ipad/.test(lower)) device = "iPad";
  else if (/android/.test(lower)) device = "Android";
  else if (/macintosh|mac os x/.test(lower)) device = "Mac";
  else if (/windows/.test(lower)) device = "Windows";
  else if (/linux/.test(lower)) device = "Linux";

  let browser: string | null = null;
  if (/edg\//.test(lower)) browser = "Edge";
  else if (/chrome\//.test(lower) && !/edg\//.test(lower)) browser = "Chrome";
  else if (/firefox\//.test(lower)) browser = "Firefox";
  else if (/safari\//.test(lower) && !/chrome\//.test(lower)) browser = "Safari";

  const parts = [device, browser].filter(Boolean) as string[];
  if (parts.length === 0) return ua.slice(0, 60);
  return parts.join(" · ");
}

/**
 * Estado do aviso prévio exibido na UI. `null` significa que o diálogo
 * está fechado.
 */
export type SingleSessionWarning = {
  secondsLeft: number;
  otherDeviceLabel: string | null;
};

/**
 * Hook que orquestra a sessão única e o aviso prévio. Devolve:
 *  - `warning`: estado atual do aviso (ou `null` se nada pendente).
 *  - `keepThisDevice()`: reivindica o token de volta neste dispositivo.
 *  - `logoutNow()`: força logout imediato sem esperar o countdown.
 */
export function useSingleSession() {
  const navigate = useNavigate();
  const [warning, setWarning] = useState<SingleSessionWarning | null>(null);

  // Refs para coordenar timers/IDs sem reexecutar o effect principal.
  const currentUserIdRef = useRef<string | null>(null);
  const currentTokenRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  /** Limpa o timer do countdown (idempotente). */
  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  /** Persiste o token atual no localStorage (best-effort). */
  const persistToken = useCallback((token: string | null) => {
    try {
      if (token) window.localStorage.setItem(ACTIVE_TOKEN_KEY, token);
      else window.localStorage.removeItem(ACTIVE_TOKEN_KEY);
    } catch {
      // ignore — modo privado pode bloquear localStorage
    }
  }, []);

  /** Faz o upsert de uma nova sessão para `userId`, gerando token novo. */
  const claimSession = useCallback(
    async (userId: string) => {
      const token = generateToken();
      currentTokenRef.current = token;
      persistToken(token);
      const ua = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 240) : null;
      await (supabase as any).from("active_sessions").upsert(
        {
          user_id: userId,
          session_token: token,
          user_agent: ua,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    },
    [persistToken],
  );

  /** Logout efetivo — limpa estado, sinaliza tela de login e redireciona. */
  const performLogout = useCallback(async () => {
    if (!mountedRef.current) return;
    clearCountdown();
    setWarning(null);
    persistToken(null);
    try {
      window.sessionStorage.setItem(SINGLE_SESSION_KICK_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    toast.error("Sessão encerrada", {
      description: "Sua conta foi acessada em outro dispositivo.",
      duration: 6000,
    });
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }, [clearCountdown, navigate, persistToken]);

  /**
   * Inicia o aviso prévio com countdown. Se `otherUa` vier preenchido,
   * mostra um rótulo amigável do dispositivo que entrou.
   */
  const startWarning = useCallback(
    (otherUa: string | null) => {
      // Se já existe um aviso aberto, não reinicia o timer (evita "ping-pong"
      // se o realtime emitir múltiplos eventos seguidos para o mesmo evento).
      if (countdownRef.current) return;
      const label = summarizeUserAgent(otherUa);
      setWarning({ secondsLeft: GRACE_PERIOD_SECONDS, otherDeviceLabel: label });
      countdownRef.current = setInterval(() => {
        setWarning((prev) => {
          if (!prev) return prev;
          const next = prev.secondsLeft - 1;
          if (next <= 0) {
            // Tempo esgotou — dispara o logout no próximo tick para não
            // chamar setState em cascata dentro do próprio updater.
            queueMicrotask(() => {
              void performLogout();
            });
            return { ...prev, secondsLeft: 0 };
          }
          return { ...prev, secondsLeft: next };
        });
      }, 1000);
    },
    [performLogout],
  );

  /** Configura escuta realtime para detectar troca de token. */
  const setupRealtime = useCallback(
    (userId: string) => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
      }
      channelRef.current = supabase
        .channel(`active-session-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "active_sessions",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const row = (payload.new ?? payload.old) as {
              session_token?: string;
              user_agent?: string | null;
            } | null;
            if (!row) return;
            if (!currentTokenRef.current) return;
            if (row.session_token && row.session_token !== currentTokenRef.current) {
              // Outro dispositivo tomou o slot — abre aviso prévio em vez
              // de deslogar imediatamente.
              startWarning(row.user_agent ?? null);
            }
          },
        )
        .subscribe();
    },
    [startWarning],
  );

  /** Reage ao usuário autenticado mudar (login/logout/refresh). */
  const handleAuthUser = useCallback(
    async (userId: string | null) => {
      if (!userId) {
        if (channelRef.current) {
          void supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        currentUserIdRef.current = null;
        currentTokenRef.current = null;
        clearCountdown();
        setWarning(null);
        return;
      }
      if (currentUserIdRef.current === userId) return;
      currentUserIdRef.current = userId;
      await claimSession(userId);
      setupRealtime(userId);
    },
    [claimSession, clearCountdown, setupRealtime],
  );

  /**
   * Ação do usuário no diálogo: "Manter esta sessão". Reivindica um token
   * novo (que vai expulsar o outro dispositivo via realtime) e fecha o aviso.
   */
  const keepThisDevice = useCallback(async () => {
    const userId = currentUserIdRef.current;
    if (!userId) {
      // Caso de borda: sessão expirou enquanto o diálogo estava aberto.
      clearCountdown();
      setWarning(null);
      return;
    }
    clearCountdown();
    setWarning(null);
    await claimSession(userId);
    toast.success("Sessão restaurada neste dispositivo", {
      description: "O outro dispositivo será desconectado.",
      duration: 5000,
    });
  }, [claimSession, clearCountdown]);

  /** Ação do usuário no diálogo: "Sair agora". */
  const logoutNow = useCallback(() => {
    void performLogout();
  }, [performLogout]);

  // Effect principal: bootstrap de sessão + auth listener.
  useEffect(() => {
    if (typeof window === "undefined") return;
    mountedRef.current = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mountedRef.current) return;
      void handleAuthUser(data.session?.user.id ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        void handleAuthUser(session?.user.id ?? null);
      } else if (event === "SIGNED_OUT") {
        void handleAuthUser(null);
      }
    });

    return () => {
      mountedRef.current = false;
      listener.subscription.unsubscribe();
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
      }
      clearCountdown();
    };
  }, [handleAuthUser, clearCountdown]);

  return { warning, keepThisDevice, logoutNow };
}
