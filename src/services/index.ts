/**
 * Ponto único de import para os services do projeto.
 * Componentes e rotas devem usar `import { ... } from "@/services"`,
 * nunca chamar Supabase diretamente para essas entidades.
 */
export type { ServiceResult } from "./catalog.service";
export {
  listActiveCategories,
  getCategoryBySlug,
  listActiveStories,
  getStoryBySlug,
  listStoriesByCategorySlug,
  listStoryPages,
  upsertCategory,
  upsertStory,
  updateStory,
} from "./catalog.service";
export type {
  StoryCategoryRow,
  StoryRow,
  StoryPageRow,
  StoryWithCategories,
} from "./catalog.service";
export { getActiveBranding, updateBranding } from "./branding.service";
export type { BrandingRow } from "./branding.service";
export { getSetting, listSettings, setSetting } from "./app-settings.service";
export type { AppSettingRow } from "./app-settings.service";

/* --- Fase 2: progresso, pintura, gamificação --- */

export {
  getStoryProgress,
  listMyStoryProgress,
  upsertStoryProgress,
  listPageProgress,
  upsertPageProgress,
} from "./progress.service";
export type { UserStoryProgressRow, UserPageProgressRow } from "./progress.service";

export {
  getArtwork,
  listArtworksByStory,
  saveArtwork,
  uploadArtworkRender,
} from "./artworks.service";
export type { UserArtworkRow } from "./artworks.service";

export {
  listActiveAchievements,
  listMyAchievements,
  unlockAchievement,
  markAchievementSeen,
  grantReward,
  getMyStreak,
  touchStreakToday,
} from "./gamification.service";
export type {
  AchievementRow,
  UserAchievementRow,
  UserRewardRow,
  UserStreakRow,
} from "./gamification.service";

export {
  listMyFavorites,
  addFavoriteStory,
  removeFavoriteStory,
  isStoryFavorite,
} from "./favorites.service";
export type { UserFavoriteRow } from "./favorites.service";

export { logActivity, listRecentActivity } from "./recent-activity.service";
export type { UserRecentActivityRow } from "./recent-activity.service";
