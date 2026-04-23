/**
 * Service para o store chave/valor de configurações globais (`app_settings_kv`).
 * Os valores são JSON arbitrário tipado em uso.
 *
 * Não confundir com a tabela legada `app_settings` (configuração de e-mail).
 * Este KV é a base nova e genérica que o PRD pediu (mobile_app_mode, autosave,
 * gamificação etc.).
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type AppSettingRow = Tables<"app_settings_kv">;

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

function fail<T = never>(error: unknown): ServiceResult<T> {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
  return { data: null, error: message };
}

export async function getSetting<T = unknown>(key: string): Promise<ServiceResult<T | null>> {
  const { data, error } = await supabase
    .from("app_settings_kv")
    .select("value_json")
    .eq("key", key)
    .maybeSingle();
  if (error) return fail(error);
  return { data: (data?.value_json as T) ?? null, error: null };
}

export async function listSettings(): Promise<ServiceResult<AppSettingRow[]>> {
  const { data, error } = await supabase
    .from("app_settings_kv")
    .select("*")
    .order("key", { ascending: true });
  if (error) return fail(error);
  return { data: data ?? [], error: null };
}

export async function setSetting<T>(
  key: string,
  value: T,
  description?: string,
): Promise<ServiceResult<AppSettingRow>> {
  const payload = {
    key,
    value_json: value as never,
    ...(description ? { description } : {}),
  };
  const { data, error } = await supabase
    .from("app_settings_kv")
    .upsert(payload, { onConflict: "key" })
    .select()
    .single();
  if (error) return fail(error);
  return { data, error: null };
}
