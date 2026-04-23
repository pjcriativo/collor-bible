/**
 * Garante que os flags persistentes de "microtoast já exibido" funcionam.
 * Esses flags são consumidos por `colorir.$slug.tsx` para impedir que o
 * mesmo microtoast (página concluída, milestone, história concluída,
 * primeira página, metade da história) reapareça ao recarregar a tela
 * numa página/história já 100% concluída.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  hasShownPageCompleteToast,
  markPageCompleteToastShown,
  hasShownMilestoneToast,
  markMilestoneToastShown,
  hasShownStoryDoneToast,
  markStoryDoneToastShown,
  hasShownFirstPageToast,
  markFirstPageToastShown,
  hasShownHalfStoryToast,
  markHalfStoryToastShown,
} from "@/lib/store";

describe("microtoast shown-flags (proteção anti-repetição após reload)", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it("page-complete: marca por (slug, pageIndex) e não vaza entre páginas", () => {
    expect(hasShownPageCompleteToast("noe", 0)).toBe(false);
    markPageCompleteToastShown("noe", 0);
    expect(hasShownPageCompleteToast("noe", 0)).toBe(true);
    // outra página mesma história: ainda não
    expect(hasShownPageCompleteToast("noe", 1)).toBe(false);
    // outra história: ainda não
    expect(hasShownPageCompleteToast("davi", 0)).toBe(false);
  });

  it("page-complete: chamar mark duas vezes é idempotente", () => {
    markPageCompleteToastShown("noe", 2);
    markPageCompleteToastShown("noe", 2);
    markPageCompleteToastShown("noe", 2);
    expect(hasShownPageCompleteToast("noe", 2)).toBe(true);
  });

  it("milestone: marca por label e persiste", () => {
    expect(hasShownMilestoneToast("Semente")).toBe(false);
    markMilestoneToastShown("Semente");
    expect(hasShownMilestoneToast("Semente")).toBe(true);
    expect(hasShownMilestoneToast("Artista")).toBe(false);
  });

  it("storyDone, firstPage, halfStory: marcam por slug independentemente", () => {
    markStoryDoneToastShown("noe");
    markFirstPageToastShown("davi");
    markHalfStoryToastShown("jonas");
    expect(hasShownStoryDoneToast("noe")).toBe(true);
    expect(hasShownFirstPageToast("davi")).toBe(true);
    expect(hasShownHalfStoryToast("jonas")).toBe(true);
    // não vazam entre tipos
    expect(hasShownFirstPageToast("noe")).toBe(false);
    expect(hasShownHalfStoryToast("davi")).toBe(false);
    expect(hasShownStoryDoneToast("jonas")).toBe(false);
  });
});
