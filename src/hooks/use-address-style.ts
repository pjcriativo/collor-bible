import { useCallback, useEffect, useState } from "react";
import { debugLog } from "@/lib/debug-log";
import {
  ADDRESS_STYLE_STORAGE_KEY,
  ADDRESS_STYLE_UPDATE_EVENT,
  getAddressStyle,
  setAddressStyle as persistAddressStyle,
  type AddressStyle,
} from "@/lib/store";

/**
 * Estado global do "estilo de tratamento" — preferência do pai/responsável
 * sobre como o app fala com a criança nas mensagens:
 *   - "name": usa o nome ("Boa, Davi! Mais uma página pintada!")
 *   - "you":  usa o pronome de 2ª pessoa sem nome ("Boa! Mais uma página
 *             pintada!")
 *
 * Por que existe um hook separado:
 *   - sincroniza atualizações entre componentes na MESMA aba via
 *     `CustomEvent` (igual `useChildName`);
 *   - sincroniza entre ABAS via `storage` event;
 *   - evita que cada caller tenha que lembrar de assinar o evento manualmente.
 */
export function useAddressStyle(): {
  addressStyle: AddressStyle;
  setAddressStyle: (next: AddressStyle) => void;
} {
  const [style, setStyle] = useState<AddressStyle>(() => getAddressStyle());

  useEffect(() => {
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<AddressStyle>).detail;
      debugLog("address-style", "custom-event", { detail });
      if (detail === "name" || detail === "you") setStyle(detail);
    };
    window.addEventListener(ADDRESS_STYLE_UPDATE_EVENT, onUpdate as EventListener);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== ADDRESS_STYLE_STORAGE_KEY) return;
      debugLog("address-style", "storage", { newValue: event.newValue });
      // Re-lê via getter para garantir o fallback consistente.
      setStyle(getAddressStyle());
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(ADDRESS_STYLE_UPDATE_EVENT, onUpdate as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setAddressStyle = useCallback((next: AddressStyle) => {
    setStyle(next);
    persistAddressStyle(next);
  }, []);

  return { addressStyle: style, setAddressStyle };
}
