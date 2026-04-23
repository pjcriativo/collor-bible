/**
 * Helpers de microcopy personalizado.
 *
 * Regra: SE há nome de criança salvo, retorna a versão personalizada;
 * SE NÃO, retorna a genérica original. Nunca quebra o fluxo se `name`
 * for vazio. Centralizar aqui evita 1) ifs espalhados, 2) escapar `{name}`
 * no lugar errado, 3) divergência por idioma.
 */
import type { AppLanguage } from "@/lib/i18n";
import type { AddressStyle } from "@/lib/store";

type Variant = { generic: string; named: string };
type Copy = Record<AppLanguage, Variant>;

/**
 * Defesa em profundidade: mesmo que um caller esqueça de passar o nome
 * pelo `sanitizeChildName`, garantimos aqui que valores ruins viram
 * fallback genérico em vez de produzir copy estranho como
 * "Olá,   " ou "Parabéns, !!!".
 *
 * Considera inválido:
 *   - null/undefined/não-string
 *   - string só com espaços
 *   - string sem nenhuma letra (ex: "123", "!!!", "---")
 *   - placeholders óbvios ("null", "undefined", "{name}")
 */
export function isValidChildName(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const lowered = trimmed.toLowerCase();
  if (lowered === "null" || lowered === "undefined" || lowered === "{name}") return false;
  // precisa ter pelo menos UMA letra (evita "123", "!!!", "—")
  if (!/\p{L}/u.test(trimmed)) return false;
  return true;
}

/** Normaliza para uso em template: trim + colapso de espaços. Vazio se inválido. */
function safeName(raw: string): string {
  if (!isValidChildName(raw)) return "";
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * Seleciona a variante (`named` vs `generic`) considerando:
 *   1) se há um nome válido, e
 *   2) o `style` configurado pelo pai/responsável.
 *
 * Regras:
 *   - `style === "you"`  → SEMPRE usa o `generic`, mesmo com nome salvo
 *     (o pai pediu pra não ser chamado pelo nome). As frases `generic`
 *     já são gramaticalmente corretas em PT/EN/ES usando "você"/"you"/"tú".
 *   - `style === "name"` (padrão) → usa `named` quando há nome válido;
 *     cai no `generic` quando não há (não dá pra inserir um nome vazio).
 */
function pick(
  copy: Copy,
  language: AppLanguage,
  name: string,
  style: AddressStyle = "name",
): string {
  const variant = copy[language] ?? copy["pt-BR"];
  if (style === "you") return variant.generic;
  const safe = safeName(name);
  if (!safe) return variant.generic;
  return variant.named.replace(/\{name\}/g, safe);
}

/**
 * Saudação do perfil.
 *
 * Fallback (sem nome ou style="you"): texto NEUTRO e elegante — evitamos
 * "amiguinho/little friend/amiguito" porque soa infantilizado para pais e
 * para crianças mais velhas. "Olá!" / "Hi there!" / "¡Hola!" cumprem o
 * mesmo papel sem destoar do tom premium do app.
 */
export const profileGreeting = (
  language: AppLanguage,
  name: string,
  style: AddressStyle = "name",
): string =>
  pick(
    {
      "pt-BR": { generic: "Olá!", named: "Olá, {name}" },
      "en-US": { generic: "Hi there!", named: "Hi, {name}" },
      "es-ES": { generic: "¡Hola!", named: "Hola, {name}" },
    },
    language,
    name,
    style,
  );

/** Título do modal de página completa. */
export const pageCompleteTitle = (
  language: AppLanguage,
  name: string,
  style: AddressStyle = "name",
): string =>
  pick(
    {
      "pt-BR": {
        generic: "Parabéns! Página completa! 🎉",
        named: "Parabéns, {name}! Página completa! 🎉",
      },
      "en-US": {
        generic: "Awesome! Page complete! 🎉",
        named: "Awesome, {name}! Page complete! 🎉",
      },
      "es-ES": {
        generic: "¡Felicidades! ¡Página completa! 🎉",
        named: "¡Felicidades, {name}! ¡Página completa! 🎉",
      },
    },
    language,
    name,
    style,
  );

/** Subtexto do modal de página completa. */
export const pageCompleteBody = (
  language: AppLanguage,
  name: string,
  style: AddressStyle = "name",
): string =>
  pick(
    {
      "pt-BR": {
        generic:
          "Você pintou todos os elementos desta página. Continue pintando para concluir a história!",
        named:
          "{name}, você pintou todos os elementos desta página. Continue para concluir a história!",
      },
      "en-US": {
        generic: "You colored every element on this page. Keep going to finish the story!",
        named: "{name}, you colored every element on this page. Keep going to finish the story!",
      },
      "es-ES": {
        generic:
          "Coloreaste todos los elementos de esta página. ¡Sigue pintando para terminar la historia!",
        named:
          "{name}, coloreaste todos los elementos de esta página. ¡Sigue para terminar la historia!",
      },
    },
    language,
    name,
    style,
  );

/** Título do modal de história concluída (sem novo milestone). */
export const storyCompleteTitle = (
  language: AppLanguage,
  name: string,
  style: AddressStyle = "name",
): string =>
  pick(
    {
      "pt-BR": { generic: "Parabéns!", named: "Parabéns, {name}!" },
      "en-US": { generic: "Congratulations!", named: "Congratulations, {name}!" },
      "es-ES": { generic: "¡Felicidades!", named: "¡Felicidades, {name}!" },
    },
    language,
    name,
    style,
  );

/** Título do modal quando desbloqueia novo milestone. */
export const storyMilestoneTitle = (
  language: AppLanguage,
  name: string,
  style: AddressStyle = "name",
): string =>
  pick(
    {
      "pt-BR": {
        generic: "Parabéns! Você desbloqueou uma nova fase!",
        named: "Parabéns, {name}! Você desbloqueou uma nova fase!",
      },
      "en-US": {
        generic: "Congratulations! You unlocked a new stage!",
        named: "Congratulations, {name}! You unlocked a new stage!",
      },
      "es-ES": {
        generic: "¡Felicidades! ¡Desbloqueaste una nueva fase!",
        named: "¡Felicidades, {name}! ¡Desbloqueaste una nueva fase!",
      },
    },
    language,
    name,
    style,
  );

/**
 * Microtoast curto disparado ao concluir uma página.
 * Mensagem propositalmente leve — o modal grande já dá o destaque visual,
 * o toast só reforça com o nome da criança quando existir.
 */
export const pageCompleteToast = (
  language: AppLanguage,
  name: string,
  style: AddressStyle = "name",
): string =>
  pick(
    {
      "pt-BR": {
        generic: "Boa! Mais uma página pintada!",
        named: "Boa, {name}! Mais uma página pintada!",
      },
      "en-US": {
        generic: "Nice! Another page colored!",
        named: "Nice, {name}! Another page colored!",
      },
      "es-ES": {
        generic: "¡Bien! ¡Otra página coloreada!",
        named: "¡Bien, {name}! ¡Otra página coloreada!",
      },
    },
    language,
    name,
    style,
  );

/** Microtoast curto disparado ao desbloquear uma nova fase (milestone). */
export const milestoneToast = (
  language: AppLanguage,
  name: string,
  milestoneLabel: string,
  style: AddressStyle = "name",
): string => {
  const base = pick(
    {
      "pt-BR": { generic: "Você desbloqueou {ms}!", named: "{name}, você desbloqueou {ms}!" },
      "en-US": { generic: "You unlocked {ms}!", named: "{name}, you unlocked {ms}!" },
      // ES: garantimos a abertura "¡" no início e o fechamento "!" no fim
      // para que a frase com nome (ex.: "Davi, ¡desbloqueaste Aprendiz!")
      // siga a pontuação correta do espanhol.
      "es-ES": { generic: "¡Desbloqueaste {ms}!", named: "¡{name}, desbloqueaste {ms}!" },
    },
    language,
    name,
    style,
  );
  return base.replace(/\{ms\}/g, milestoneLabel);
};

/**
 * Microtoast disparado quando a criança conclui a PRIMEIRA página de uma história.
 * Marca o "começo" da jornada com um incentivo caloroso.
 */
export const firstPageOfStoryToast = (
  language: AppLanguage,
  name: string,
  style: AddressStyle = "name",
): string =>
  pick(
    {
      "pt-BR": {
        generic: "Que comecinho lindo! Continue pintando 💛",
        named: "Que comecinho lindo, {name}! Continue pintando 💛",
      },
      "en-US": {
        generic: "What a lovely start! Keep coloring 💛",
        named: "What a lovely start, {name}! Keep coloring 💛",
      },
      "es-ES": {
        generic: "¡Qué bonito comienzo! Sigue pintando 💛",
        named: "¡Qué bonito comienzo, {name}! Sigue pintando 💛",
      },
    },
    language,
    name,
    style,
  );

/**
 * Microtoast disparado quando a história cruza 50% de progresso.
 * Reforça o sentimento de "estou indo bem".
 */
export const halfStoryToast = (
  language: AppLanguage,
  name: string,
  style: AddressStyle = "name",
): string =>
  pick(
    {
      "pt-BR": {
        generic: "Você já está na metade! Falta pouco ✨",
        named: "Boa, {name}! Você já está na metade! Falta pouco ✨",
      },
      "en-US": {
        generic: "You're halfway there! Almost done ✨",
        named: "Nice, {name}! You're halfway there! Almost done ✨",
      },
      "es-ES": {
        generic: "¡Ya estás a la mitad! Falta poco ✨",
        named: "¡Bien, {name}! ¡Ya estás a la mitad! Falta poco ✨",
      },
    },
    language,
    name,
    style,
  );

/**
 * Microtoast disparado quando a criança conclui uma história inteira
 * (sem necessariamente desbloquear novo milestone). Reforça o "muito bem"
 * direto pedido pelo PRD.
 */
export const storyDoneToast = (
  language: AppLanguage,
  name: string,
  style: AddressStyle = "name",
): string =>
  pick(
    {
      "pt-BR": {
        generic: "Muito bem! Você terminou a história! 🎊",
        named: "Muito bem, {name}! Você terminou a história! 🎊",
      },
      "en-US": {
        generic: "Well done! You finished the story! 🎊",
        named: "Well done, {name}! You finished the story! 🎊",
      },
      "es-ES": {
        generic: "¡Muy bien! ¡Terminaste la historia! 🎊",
        named: "¡Muy bien, {name}! ¡Terminaste la historia! 🎊",
      },
    },
    language,
    name,
    style,
  );

/**
 * Saudação curta exibida ACIMA do título na tela de início de história
 * (ex.: "Vamos começar, Davi?" / "Pronto para colorir, Davi?").
 *
 * Quando NÃO há nome salvo OU o pai escolheu o estilo "you" retornamos
 * string vazia — o componente simplesmente não renderiza o eyebrow,
 * mantendo a hierarquia visual original. Isso é diferente das outras
 * copies (que têm fallback genérico) porque aqui o objetivo é INCLUIR o
 * nome; sem nome (ou com tratamento por pronome), não há eyebrow.
 */
export const storyIntroEyebrow = (
  language: AppLanguage,
  name: string,
  style: AddressStyle = "name",
): string => {
  if (style === "you") return "";
  if (!isValidChildName(name)) return "";
  return pick(
    {
      "pt-BR": { generic: "", named: "Vamos começar, {name}?" },
      "en-US": { generic: "", named: "Ready to start, {name}?" },
      "es-ES": { generic: "", named: "¿Empezamos, {name}?" },
    },
    language,
    name,
    style,
  );
};
