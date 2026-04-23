/**
 * Service centralizado de progresso por história e por página.
 *
 * IMPORTANTE — Fase 2:
 *  - Esta camada existe para ser consumida pela Fase 5 (migração real do
 *    localStorage). Hoje o app continua usando `src/lib/store.ts` como
 *    fonte de verdade local — não substitua nada visível agora.
 *  - Toda escrita exige usuário autenticado: as policies de RLS recusam
 *    qualquer registro cujo `user_id` não bata com `auth.uid()`.
 *  - Operações são idempotentes via `upsert(onConflict: ...)`, então é
 *    seguro chamar autosave várias vezes sem duplicar.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type UserStoryProgressRow = Tables<"user_story_progress">;
export type UserPageProgressRow = Tables<"user_page_progress">;

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

/* -------------------- Story progress -------------------- */

export async function getStoryProgress(
  storySlug: string,
): Promise<ServiceResult<UserStoryProgressRow | null>> {
  const userId = await getUserId();
  if (!userId) return { data: null, error: null };
  const { data, error } = await supabase
    .from("user_story_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("story_slug", storySlug)
    .maybeSingle();
  if (error) return fail(error);
  return { data, error: null };
}

export async function listMyStoryProgress(): Promise<ServiceResult<UserStoryProgressRow[]>> {
  const userId = await getUserId();
  if (!userId) return { data: [], error: null };
  const { data, error } = await supabase
    .from("user_story_progress")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) return fail(error);
  return { data: data ?? [], error: null };
}

export async function upsertStoryProgress(payload: {
  storySlug: string;
  storyId?: string | null;
  status?: "not_started" | "in_progress" | "completed";
  pagesCompleted?: number;
  completionPercent?: number;
  currentPageIndex?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
}): Promise<ServiceResult<UserStoryProgressRow>> {
  const userId = await getUserId();
  if (!userId) return fail("not_authenticated");

  const row: TablesInsert<"user_story_progress"> = {
    user_id: userId,
    story_slug: payload.storySlug,
    story_id: payload.storyId ?? null,
    status: payload.status ?? "in_progress",
    pages_completed: payload.pagesCompleted ?? 0,
    completion_percent: payload.completionPercent ?? 0,
    current_page_index: payload.currentPageIndex ?? null,
    started_at: payload.startedAt ?? null,
    completed_at: payload.completedAt ?? null,
  };

  const { data, error } = await supabase
    .from("user_story_progress")
    .upsert(row, { onConflict: "user_id,story_slug" })
    .select()
    .single();
  if (error) return fail(error);
  return { data, error: null };
}

/* -------------------- Page progress -------------------- */

export async function listPageProgress(
  storySlug: string,
): Promise<ServiceResult<UserPageProgressRow[]>> {
  const userId = await getUserId();
  if (!userId) return { data: [], error: null };
  const { data, error } = await supabase
    .from("user_page_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("story_slug", storySlug)
    .order("page_index", { ascending: true });
  if (error) return fail(error);
  return { data: data ?? [], error: null };
}

export async function upsertPageProgress(payload: {
  storySlug: string;
  pageIndex: number;
  storyId?: string | null;
  pageId?: string | null;
  status?: "not_started" | "in_progress" | "completed";
  startedAt?: string | null;
  completedAt?: string | null;
  lastOpenedAt?: string | null;
  timeSpentSeconds?: number;
}): Promise<ServiceResult<UserPageProgressRow>> {
  const userId = await getUserId();
  if (!userId) return fail("not_authenticated");

  const row: TablesInsert<"user_page_progress"> = {
    user_id: userId,
    story_slug: payload.storySlug,
    page_index: payload.pageIndex,
    story_id: payload.storyId ?? null,
    page_id: payload.pageId ?? null,
    status: payload.status ?? "in_progress",
    started_at: payload.startedAt ?? null,
    completed_at: payload.completedAt ?? null,
    last_opened_at: payload.lastOpenedAt ?? new Date().toISOString(),
    time_spent_seconds: payload.timeSpentSeconds ?? 0,
  };

  const { data, error } = await supabase
    .from("user_page_progress")
    .upsert(row, { onConflict: "user_id,story_slug,page_index" })
    .select()
    .single();
  if (error) return fail(error);
  return { data, error: null };
}
