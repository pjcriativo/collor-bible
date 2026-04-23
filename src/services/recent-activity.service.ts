/**
 * Service de atividades recentes do usuário (para "continue de onde parou",
 * carrossel de últimas histórias, etc.).
 *
 * Tipos comuns sugeridos para `activity_type`:
 *   - opened_story | opened_page | completed_page | completed_story
 *   - downloaded_artwork | shared_artwork | unlocked_reward
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type UserRecentActivityRow = Tables<"user_recent_activity">;

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

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function logActivity(payload: {
  type: string;
  referenceId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<ServiceResult<UserRecentActivityRow>> {
  const userId = await getUserId();
  if (!userId) return fail("not_authenticated");

  const row: TablesInsert<"user_recent_activity"> = {
    user_id: userId,
    activity_type: payload.type,
    reference_id: payload.referenceId ?? null,
    metadata_json: (payload.metadata ?? null) as never,
  };
  const { data, error } = await supabase.from("user_recent_activity").insert(row).select().single();
  if (error) return fail(error);
  return { data, error: null };
}

export async function listRecentActivity(
  limit = 20,
): Promise<ServiceResult<UserRecentActivityRow[]>> {
  const userId = await getUserId();
  if (!userId) return { data: [], error: null };
  const { data, error } = await supabase
    .from("user_recent_activity")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return fail(error);
  return { data: data ?? [], error: null };
}
