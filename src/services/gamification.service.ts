/**
 * Service de gamificação: conquistas, recompensas e streak.
 *
 * - Catálogo de conquistas é público (qualquer um lê o que está ativo).
 * - Concessões e recompensas são por usuário, com RLS estrita.
 * - Streak usa upsert por user_id (1 linha por usuário).
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type AchievementRow = Tables<"achievements">;
export type UserAchievementRow = Tables<"user_achievements">;
export type UserRewardRow = Tables<"user_rewards">;
export type UserStreakRow = Tables<"user_streaks">;

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

/* -------------------- Conquistas (catálogo) -------------------- */

export async function listActiveAchievements(): Promise<ServiceResult<AchievementRow[]>> {
  const { data, error } = await supabase
    .from("achievements")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) return fail(error);
  return { data: data ?? [], error: null };
}

/* -------------------- Conquistas do usuário -------------------- */

export async function listMyAchievements(): Promise<
  ServiceResult<(UserAchievementRow & { achievement: AchievementRow })[]>
> {
  const userId = await getUserId();
  if (!userId) return { data: [], error: null };
  const { data, error } = await supabase
    .from("user_achievements")
    .select("*, achievement:achievements(*)")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });
  if (error) return fail(error);
  return {
    data: (data ?? []) as (UserAchievementRow & { achievement: AchievementRow })[],
    error: null,
  };
}

export async function unlockAchievement(
  achievementId: string,
): Promise<ServiceResult<UserAchievementRow>> {
  const userId = await getUserId();
  if (!userId) return fail("not_authenticated");

  const row: TablesInsert<"user_achievements"> = {
    user_id: userId,
    achievement_id: achievementId,
  };
  const { data, error } = await supabase
    .from("user_achievements")
    .upsert(row, { onConflict: "user_id,achievement_id", ignoreDuplicates: false })
    .select()
    .single();
  if (error) return fail(error);
  return { data, error: null };
}

export async function markAchievementSeen(id: string): Promise<ServiceResult<UserAchievementRow>> {
  const userId = await getUserId();
  if (!userId) return fail("not_authenticated");
  const { data, error } = await supabase
    .from("user_achievements")
    .update({ seen_in_ui: true })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) return fail(error);
  return { data, error: null };
}

/* -------------------- Recompensas -------------------- */

export async function grantReward(payload: {
  type: string;
  value: Record<string, unknown>;
  source?: string;
}): Promise<ServiceResult<UserRewardRow>> {
  const userId = await getUserId();
  if (!userId) return fail("not_authenticated");

  const row: TablesInsert<"user_rewards"> = {
    user_id: userId,
    type: payload.type,
    value_json: payload.value as never,
    source: payload.source ?? null,
  };
  const { data, error } = await supabase.from("user_rewards").insert(row).select().single();
  if (error) return fail(error);
  return { data, error: null };
}

/* -------------------- Streak -------------------- */

export async function getMyStreak(): Promise<ServiceResult<UserStreakRow | null>> {
  const userId = await getUserId();
  if (!userId) return { data: null, error: null };
  const { data, error } = await supabase
    .from("user_streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return fail(error);
  return { data, error: null };
}

/**
 * Atualiza streak baseado na atividade de hoje (UTC).
 * Regra: se a última atividade foi ontem → +1; se foi hoje → no-op;
 * caso contrário → reseta para 1.
 */
export async function touchStreakToday(): Promise<ServiceResult<UserStreakRow>> {
  const userId = await getUserId();
  if (!userId) return fail("not_authenticated");

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const current = await getMyStreak();
  const last = current.data?.last_activity_date ?? null;

  let next = 1;
  if (last === today) {
    next = current.data?.current_streak_days ?? 1;
  } else if (last) {
    const lastDate = new Date(last + "T00:00:00Z").getTime();
    const todayDate = new Date(today + "T00:00:00Z").getTime();
    const diffDays = Math.round((todayDate - lastDate) / 86_400_000);
    next = diffDays === 1 ? (current.data?.current_streak_days ?? 0) + 1 : 1;
  }

  const best = Math.max(current.data?.best_streak_days ?? 0, next);

  const row: TablesInsert<"user_streaks"> = {
    user_id: userId,
    current_streak_days: next,
    best_streak_days: best,
    last_activity_date: today,
  };

  const { data, error } = await supabase
    .from("user_streaks")
    .upsert(row, { onConflict: "user_id" })
    .select()
    .single();
  if (error) return fail(error);
  return { data, error: null };
}
