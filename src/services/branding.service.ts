/**
 * Service centralizado de branding.
 * Reutiliza a tabela `branding_settings` já em produção (singleton: pega o
 * registro mais recente) e expõe uma API tipada para leitura/escrita.
 *
 * O hook `use-branding.ts` continua sendo a forma de consumir branding na UI;
 * este service é a base oficial de servidor para próximas fases (admin novo,
 * seed, jobs, etc.). Mantemos retrocompatibilidade total.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type BrandingRow = Tables<"branding_settings">;

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

export async function getActiveBranding(): Promise<ServiceResult<BrandingRow | null>> {
  const { data, error } = await supabase
    .from("branding_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return fail(error);
  return { data, error: null };
}

export async function updateBranding(
  id: string,
  payload: TablesUpdate<"branding_settings">,
): Promise<ServiceResult<BrandingRow>> {
  const { data, error } = await supabase
    .from("branding_settings")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) return fail(error);
  return { data, error: null };
}
