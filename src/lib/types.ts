export type Testament = "antigo" | "novo";

export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string;
  emoji?: string;
  color?: "sky" | "gold" | "coral" | "mint" | "deep";
}

export interface ColoringPage {
  id: string;
  /** SVG markup with paintable regions (paths/shapes with id starting with "fill-") */
  svg: string;
}

export interface Story {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  shortDescription: string;
  description: string;
  ageRange: string;
  testament: Testament;
  categoryIds: string[];
  cover: string;
  coverSmall?: string;
  coverMedium?: string;
  pages: ColoringPage[];
  featured?: boolean;
  isNew?: boolean;
  active: boolean;
  order: number;
  /** for featured "loved" sorting */
  loved?: number;
}

export interface Banner {
  id: string;
  storySlug: string;
  headline: string;
  subline: string;
  active: boolean;
}

export interface ColoringProgress {
  storySlug: string;
  pageIndex: number;
  fills: Record<string, string>; // regionId -> color
  /** índices de páginas que já receberam alguma pintura */
  completedPages: number[];
  /** mapa de fills por índice de página — preserva a pintura de cada página ao navegar */
  pagesFills?: Record<number, Record<string, string>>;
  updatedAt: number;
}

export interface StoryCompletionRecord {
  storySlug: string;
  completedAt: number;
}
