/**
 * Guard em memória (sessão) para impedir que o MESMO microtoast apareça
 * duas vezes seguidas para a MESMA criança.
 *
 * Por que existe além de `shown-toasts` (persistente em localStorage):
 *   - `shown-toasts` é "uma vez por dispositivo" — bom para reload, mas não
 *     cobre dupla emissão dentro da mesma sessão (ex.: callback dispara duas
 *     vezes por re-render rápido, navegação ida/volta entre páginas, etc.).
 *   - este guard é "duas vezes seguidas, no mesmo perfil/criança, na mesma
 *     aba" — complementar, não substitui o persistente.
 *
 * Regra exata (conforme PRD):
 *   - se o ÚLTIMO microtoast emitido para esta criança tiver a MESMA chave,
 *     pular este disparo;
 *   - se a chave for diferente do último, registrar e permitir;
 *   - trocar de criança (childName) reseta o "último" (cada perfil tem o seu).
 *
 * Não persiste em storage de propósito: é um guard de sessão.
 */
const lastToastByChild = new Map<string, string>();

function normalizeChild(childName: string | null | undefined): string {
  return (childName ?? "").trim().toLowerCase() || "__no_child__";
}

/**
 * Retorna `true` se este microtoast PODE aparecer agora (e marca como o
 * último); retorna `false` se for repetição imediata para esta criança.
 *
 * `key` deve identificar o microtoast de forma estável (ex.: "page-complete:noe:2",
 * "milestone:Semente", "story-done:davi"). Não precisa incluir o nome da
 * criança — o map já é segmentado por perfil.
 */
export function allowSessionToast(childName: string | null | undefined, key: string): boolean {
  const child = normalizeChild(childName);
  const last = lastToastByChild.get(child);
  if (last === key) return false;
  lastToastByChild.set(child, key);
  return true;
}

/** Apenas para testes — limpa o estado em memória. */
export function __resetSessionToastGuard() {
  lastToastByChild.clear();
}
