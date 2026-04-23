/**
 * Garante que a preferência de colunas:
 *  - persiste no localStorage,
 *  - propaga para outros consumidores na mesma aba (CustomEvent),
 *  - aceita atualização cross-tab via StorageEvent,
 *  - faz fallback para 5 quando o valor é inválido.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { catalogGridClass, useCatalogColumns } from "./use-catalog-columns";

const KEY = "ccj.catalog-columns.v1";

beforeEach(() => window.localStorage.clear());
afterEach(() => window.localStorage.clear());

describe("useCatalogColumns", () => {
  it("default = 5 quando nada salvo", () => {
    const { result } = renderHook(() => useCatalogColumns());
    expect(result.current.columns).toBe(5);
  });

  it("setColumns(4) grava no localStorage e atualiza o estado", () => {
    const { result } = renderHook(() => useCatalogColumns());
    act(() => result.current.setColumns(4));
    expect(result.current.columns).toBe(4);
    expect(window.localStorage.getItem(KEY)).toBe("4");
  });

  it("propaga mudança para outro consumidor na mesma aba", () => {
    const a = renderHook(() => useCatalogColumns());
    const b = renderHook(() => useCatalogColumns());
    act(() => a.result.current.setColumns(4));
    expect(b.result.current.columns).toBe(4);
  });

  it("StorageEvent (outra aba) atualiza o consumidor atual", () => {
    const { result } = renderHook(() => useCatalogColumns());
    expect(result.current.columns).toBe(5);
    act(() => {
      window.localStorage.setItem(KEY, "4");
      window.dispatchEvent(new StorageEvent("storage", { key: KEY, newValue: "4" }));
    });
    expect(result.current.columns).toBe(4);
  });

  it("valor inválido no storage cai no default 5", () => {
    window.localStorage.setItem(KEY, "lixo");
    const { result } = renderHook(() => useCatalogColumns());
    expect(result.current.columns).toBe(5);
  });

  it("catalogGridClass mapeia para a classe lg correta", () => {
    expect(catalogGridClass(4)).toContain("lg:grid-cols-4");
    expect(catalogGridClass(5)).toContain("lg:grid-cols-5");
    // Mobile/tablet permanecem fixos para não quebrar tamanho de toque.
    expect(catalogGridClass(4)).toContain("grid-cols-2");
    expect(catalogGridClass(5)).toContain("md:grid-cols-4");
  });
});
