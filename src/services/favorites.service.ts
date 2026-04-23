/**
 * Service de favoritos por história ou página.
 * Único por (user, story_slug) ou (user, page_id) via índices parciais.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type UserFavoriteRow = Tables<"user_favorites">;

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

export async function listMyFavorites(): Promise<ServiceResult<UserFavoriteRow[]>> {
  const userId = await getUserId();
  if (!userId) return { data: [], error: null };
  const { data, error } = await supabase
    .from("user_favorites")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return fail(error);
  return { data: data ?? [], error: null };
}

export async function addFavoriteStory(
  storySlug: string,
  storyId?: string | null,
): Promise<ServiceResult<UserFavoriteRow>> {
  const userId = await getUserId();
  if (!userId) return fail("not_authenticated");
  const row: TablesInsert<"user_favorites"> = {
    user_id: userId,
    story_slug: storySlug,
    story_id: storyId ?? null,
  };
  const { data, error } = await supabase.from("user_favorites").insert(row).select().single();
  if (error) return fail(error);
  return { data, error: null };
}

export async function removeFavoriteStory(storySlug: string): Promise<ServiceResult<true>> {
  const userId = await getUserId();
  if (!userId) return fail("not_authenticated");
  const { error } = await supabase
    .from("user_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("story_slug", storySlug)
    .is("page_id", null);
  if (error) return fail(error);
  return { data: true, error: null };
}

export async function isStoryFavorite(storySlug: string): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) return false;
  const { data } = await supabase
    .from("user_favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("story_slug", storySlug)
    .is("page_id", null)
    .maybeSingle();
  return Boolean(data);
}
