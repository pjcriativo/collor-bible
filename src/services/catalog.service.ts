/**
 * Service centralizado de leitura/escrita do catálogo no Supabase.
 *
 * IMPORTANTE — Fase 1:
 *  - Esta camada existe para que fases futuras consumam o banco sem espalhar
 *    chamadas Supabase pelos componentes.
 *  - O app de produção AINDA lê o catálogo do código (`src/lib/store.ts`).
 *    Nada aqui é chamado por componentes hoje; mexer nisso quebraria o app.
 *  - As tipagens vêm direto do schema gerado em `integrations/supabase/types`,
 *    garantindo "tipagem forte dos modelos" pedida no PRD.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type StoryCategoryRow = Tables<"story_categories">;
export type StoryRow = Tables<"stories">;
export type StoryPageRow = Tables<"stories_pages">;

export type StoryWithCategories = StoryRow & {
  categories: Pick<StoryCategoryRow, "id" | "slug" | "title" | "color">[];
};

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

function ok<T>(data: T): ServiceResult<T> {
  return { data, error: null };
}
function fail<T = never>(error: unknown): ServiceResult<T> {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
  return { data: null, error: message };
}

/* -------------------- Categorias -------------------- */

export async function listActiveCategories(): Promise<ServiceResult<StoryCategoryRow[]>> {
  const { data, error } = await supabase
    .from("story_categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) return fail(error);
  return ok(data ?? []);
}

export async function getCategoryBySlug(
  slug: string,
): Promise<ServiceResult<StoryCategoryRow | null>> {
  const { data, error } = await supabase
    .from("story_categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) return fail(error);
  return ok(data);
}

/* -------------------- Histórias -------------------- */

export async function listActiveStories(): Promise<ServiceResult<StoryRow[]>> {
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) return fail(error);
  return ok(data ?? []);
}

export async function getStoryBySlug(
  slug: string,
): Promise<ServiceResult<StoryWithCategories | null>> {
  const { data, error } = await supabase
    .from("stories")
    .select(
      `*,
       story_categories_map (
         category:story_categories ( id, slug, title, color )
       )`,
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) return fail(error);
  if (!data) return ok(null);

  const map = (
    data as unknown as {
      story_categories_map?: { category: StoryCategoryRow | null }[];
    }
  ).story_categories_map;
  const categories = (map ?? [])
    .map((m) => m.category)
    .filter((c): c is StoryCategoryRow => Boolean(c))
    .map((c) => ({ id: c.id, slug: c.slug, title: c.title, color: c.color }));

  // O cast remove a chave aninhada `story_categories_map` antes de devolver.
  const { story_categories_map: _drop, ...story } = data as unknown as StoryRow & {
    story_categories_map?: unknown;
  };
  return ok({ ...(story as StoryRow), categories });
}

export async function listStoriesByCategorySlug(
  categorySlug: string,
): Promise<ServiceResult<StoryRow[]>> {
  const { data, error } = await supabase
    .from("story_categories_map")
    .select(
      `story:stories!inner ( * ),
       category:story_categories!inner ( slug )`,
    )
    .eq("category.slug", categorySlug);
  if (error) return fail(error);
  const rows = (data ?? [])
    .map((row: { story: StoryRow | null }) => row.story)
    .filter((s): s is StoryRow => s !== null && s.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
  return ok(rows);
}

/* -------------------- Páginas -------------------- */

export async function listStoryPages(storyId: string): Promise<ServiceResult<StoryPageRow[]>> {
  const { data, error } = await supabase
    .from("stories_pages")
    .select("*")
    .eq("story_id", storyId)
    .eq("is_active", true)
    .order("page_number", { ascending: true });
  if (error) return fail(error);
  return ok(data ?? []);
}

/* -------------------- Mutações admin -------------------- */

export async function upsertCategory(
  payload: TablesInsert<"story_categories">,
): Promise<ServiceResult<StoryCategoryRow>> {
  const { data, error } = await supabase
    .from("story_categories")
    .upsert(payload, { onConflict: "slug" })
    .select()
    .single();
  if (error) return fail(error);
  return ok(data);
}

export async function upsertStory(
  payload: TablesInsert<"stories">,
): Promise<ServiceResult<StoryRow>> {
  const { data, error } = await supabase
    .from("stories")
    .upsert(payload, { onConflict: "slug" })
    .select()
    .single();
  if (error) return fail(error);
  return ok(data);
}

export async function updateStory(
  id: string,
  payload: TablesUpdate<"stories">,
): Promise<ServiceResult<StoryRow>> {
  const { data, error } = await supabase
    .from("stories")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) return fail(error);
  return ok(data);
}
