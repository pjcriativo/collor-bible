/**
 * Garante que o sinal "nome atualizado agora" usado pelos badges nos
 * modais da página de pintura:
 *   - começa em `false` (sem flash no mount inicial);
 *   - vira `true` ao receber o `CustomEvent` da própria aba ou o
 *     `storage` event de outra aba;
 *   - volta para `false` após `durationMs`;
 *   - reinicia o timer quando há atualizações em sequência.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChildNameRecentlyUpdated } from "@/hooks/use-child-name-recently-updated";

const UPDATE_EVENT = "ccj-child-name-updated";
const LOCAL_CACHE_KEY = "ccj.child-name.cache.v1";

describe("useChildNameRecentlyUpdated", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
  });

  it("começa em false (sem flash no mount inicial)", () => {
    const { result } = renderHook(() => useChildNameRecentlyUpdated(2000));
    expect(result.current).toBe(false);
  });

  it("vira true ao receber o CustomEvent da mesma aba e volta a false após o timer", () => {
    const { result } = renderHook(() => useChildNameRecentlyUpdated(2000));
    act(() => {
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: "Davi" }));
    });
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });

  it("vira true em storage event do cache do nome (cross-tab)", () => {
    const { result } = renderHook(() => useChildNameRecentlyUpdated(1500));
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: LOCAL_CACHE_KEY,
          newValue: "Maria",
          oldValue: "Davi",
        }),
      );
    });
    expect(result.current).toBe(true);
  });

  it("ignora storage events de outras chaves", () => {
    const { result } = renderHook(() => useChildNameRecentlyUpdated(1500));
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "other-key", newValue: "x" }));
    });
    expect(result.current).toBe(false);
  });

  it("reinicia o timer quando há nova atualização antes de expirar", () => {
    const { result } = renderHook(() => useChildNameRecentlyUpdated(2000));
    act(() => {
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: "A" }));
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current).toBe(true);
    // Nova atualização: o timer reseta — após mais 1500ms ainda deve estar true
    act(() => {
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: "B" }));
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current).toBe(true);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(false);
  });

  it("limpa listeners e timer no unmount (sem efeitos colaterais)", () => {
    const { result, unmount } = renderHook(() => useChildNameRecentlyUpdated(2000));
    act(() => {
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: "A" }));
    });
    expect(result.current).toBe(true);
    unmount();
    // Disparar evento após unmount não deve quebrar nem mexer no estado.
    expect(() => {
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: "B" }));
      vi.advanceTimersByTime(5000);
    }).not.toThrow();
  });
});
