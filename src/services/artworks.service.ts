/**
 * Service de pinturas salvas (`user_artworks`).
 *
 * Estratégia de salvamento (alinhada ao PRD Fase 2):
 *  - Snapshot vetorial em `canvas_data_json` ({ fills, palette, ... }).
 *  - Render PNG opcional em `rendered_image_url` (subir no bucket privado
 *    `user-artworks` na pasta do próprio usuário).
 *  - Autosave seguro via upsert único por (user_id, story_slug, page_index).
 *  - `version` é incrementado a cada upsert para servir de checkpoint.
 *
 * Não é chamado por nenhum componente nesta fase — entra na Fase 5.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type UserArtworkRow = Tables<"user_artworks">;

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

export async function getArtwork(
  storySlug: string,
  pageIndex: number,
): Promise<ServiceResult<UserArtworkRow | null>> {
  const userId = await getUserId();
  if (!userId) return { data: null, error: null };
  const { data, error } = await supabase
    .from("user_artworks")
    .select("*")
    .eq("user_id", userId)
    .eq("story_slug", storySlug)
    .eq("page_index", pageIndex)
    .maybeSingle();
  if (error) return fail(error);
  return { data, error: null };
}

export async function listArtworksByStory(
  storySlug: string,
): Promise<ServiceResult<UserArtworkRow[]>> {
  const userId = await getUserId();
  if (!userId) return { data: [], error: null };
  const { data, error } = await supabase
    .from("user_artworks")
    .select("*")
    .eq("user_id", userId)
    .eq("story_slug", storySlug)
    .order("page_index", { ascending: true });
  if (error) return fail(error);
  return { data: data ?? [], error: null };
}

export async function saveArtwork(payload: {
  storySlug: string;
  pageIndex: number;
  storyId?: string | null;
  pageId?: string | null;
  canvasData: Record<string, unknown>;
  palette?: string[] | null;
  renderedImageUrl?: string | null;
  thumbnailUrl?: string | null;
  isFinished?: boolean;
  title?: string | null;
}): Promise<ServiceResult<UserArtworkRow>> {
  const userId = await getUserId();
  if (!userId) return fail("not_authenticated");

  // Lê versão atual para incrementar (sem bloqueio — última escrita vence)
  const current = await getArtwork(payload.storySlug, payload.pageIndex);
  const nextVersion = (current.data?.version ?? 0) + 1;

  const row: TablesInsert<"user_artworks"> = {
    user_id: userId,
    story_slug: payload.storySlug,
    page_index: payload.pageIndex,
    story_id: payload.storyId ?? null,
    page_id: payload.pageId ?? null,
    title: payload.title ?? null,
    canvas_data_json: payload.canvasData as never,
    last_color_palette_json: (payload.palette ?? null) as never,
    rendered_image_url: payload.renderedImageUrl ?? null,
    thumbnail_url: payload.thumbnailUrl ?? null,
    version: nextVersion,
    is_finished: payload.isFinished ?? false,
  };

  const { data, error } = await supabase
    .from("user_artworks")
    .upsert(row, { onConflict: "user_id,story_slug,page_index" })
    .select()
    .single();
  if (error) return fail(error);
  return { data, error: null };
}

/**
 * Faz upload do PNG renderizado da pintura para o bucket privado
 * `user-artworks/<userId>/<storySlug>/page-<n>.png` e devolve a URL pública
 * (signed URL caso o bucket fique privado — hoje basta a publicUrl pois a RLS
 * só libera para o dono).
 */
export async function uploadArtworkRender(
  storySlug: string,
  pageIndex: number,
  pngBlob: Blob,
): Promise<ServiceResult<string>> {
  const userId = await getUserId();
  if (!userId) return fail("not_authenticated");

  const path = `${userId}/${storySlug}/page-${pageIndex}.png`;
  const { error } = await supabase.storage.from("user-artworks").upload(path, pngBlob, {
    cacheControl: "3600",
    upsert: true,
    contentType: "image/png",
  });
  if (error) return fail(error);

  const { data: signed, error: signError } = await supabase.storage
    .from("user-artworks")
    .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 dias
  if (signError) return fail(signError);
  return { data: signed.signedUrl, error: null };
}
