import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Category, Story } from "@/lib/types";

export type AppLanguage = "pt-BR" | "en-US" | "es-ES";

const LANGUAGE_KEY = "ccj.app-language.v1";
const LANGUAGE_USER_SET_KEY = "ccj.app-language.user-set.v1";
const DEFAULT_LANGUAGE: AppLanguage = "pt-BR";

/**
 * Histórico persistido da ÚLTIMA mudança de idioma efetivamente aplicada
 * (não conta reversões via "Cancelar troca"). Usado pelo perfil para
 * exibir um status persistente "Idioma atual: PT-BR · Última atualização:
 * há X min (de EN-US)" mesmo após recargas — dando confiança ao usuário
 * de que a troca anterior funcionou.
 */
const LANGUAGE_HISTORY_KEY = "ccj.app-language.history.v1";

export type LanguageHistoryEntry = {
  /** Idioma anterior (pode ser null se for a primeira aplicação registrada). */
  from: AppLanguage | null;
  /** Idioma efetivamente aplicado. */
  to: AppLanguage;
  /** Timestamp em ms (Date.now()) de quando a aplicação foi consolidada. */
  at: number;
};

export function getLanguageHistory(): LanguageHistoryEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LANGUAGE_HISTORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LanguageHistoryEntry;
    if (!parsed || typeof parsed.at !== "number" || !SUPPORTED_LANGUAGES.includes(parsed.to)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function recordLanguageHistory(from: AppLanguage | null, to: AppLanguage) {
  if (typeof window === "undefined") return;
  try {
    const entry: LanguageHistoryEntry = { from, to, at: Date.now() };
    window.localStorage.setItem(LANGUAGE_HISTORY_KEY, JSON.stringify(entry));
  } catch {
    // Ignora silenciosamente — histórico é puramente informativo.
  }
}

export const LANGUAGES: Array<{ code: AppLanguage; label: string }> = [
  { code: "pt-BR", label: "Português" },
  { code: "en-US", label: "English" },
  { code: "es-ES", label: "Español" },
];

const SUPPORTED_LANGUAGES = LANGUAGES.map((language) => language.code);

/**
 * Cadeia de fallback usada quando uma tradução não existe para o idioma
 * solicitado. A ordem é: idioma pedido -> mesma família (en-* -> en-US) ->
 * idioma padrão (pt-BR). Cobre tanto idiomas listados quanto valores
 * inesperados vindos do backend (ex.: "fr-FR" sem tradução completa).
 */
function buildLanguageFallbackChain(language: string): AppLanguage[] {
  const chain: AppLanguage[] = [];
  const push = (lang: AppLanguage) => {
    if (!chain.includes(lang)) chain.push(lang);
  };

  if ((SUPPORTED_LANGUAGES as string[]).includes(language)) {
    push(language as AppLanguage);
  }

  const family = language.split("-")[0]?.toLowerCase();
  if (family === "en") push("en-US");
  else if (family === "es") push("es-ES");
  else if (family === "pt") push("pt-BR");

  // Inglês como segundo recurso para idiomas latinos modernos
  if (family && family !== "en" && family !== "pt") push("en-US");

  push(DEFAULT_LANGUAGE);
  return chain;
}

const copy = {
  "pt-BR": {
    stories: "Histórias",
    storiesBreadcrumb: "Voltar para a lista de histórias",
    featured: "Em destaque",
    colorNow: "Colorir agora",
    continueColoring: "Continue colorindo",
    whereStopped: "De onde você parou",
    oldTestament: "Antigo Testamento",
    faithAdventures: "Aventuras de fé e coragem",
    newTestament: "Novo Testamento",
    jesusTeachings: "A vida e os ensinamentos de Jesus",
    parables: "Parábolas",
    parablesSub: "Lições que Jesus ensinou",
    favorites: "Favoritos",
    yourFavorites: "Suas favoritas",
    favoriteStories: "As histórias que você mais ama",
    home: "Início",
    search: "Buscar",
    profile: "Perfil",
    news: "Novidades",
    newsHint: "Novos temas aparecem aqui automaticamente quando uma história é adicionada.",
    newTheme: "Novo tema adicionado",
    noNews: "Nenhum tema novo no momento.",
    searchStories: "Buscar histórias",
    searchHint: "Encontre uma história pelo nome, personagem ou tema bíblico",
    searchPlaceholder: "Ex: Noé, Jesus, baleia…",
    result: "resultado",
    results: "resultados",
    availableOne: "história disponível",
    availableMany: "histórias disponíveis",
    noStoryFound: "Nenhuma história encontrada",
    tryAnother: "Tente outro nome ou personagem bíblico.",
    savedEmpty: "Suas histórias salvas aparecem aqui",
    savedOne: "história salva",
    savedMany: "histórias salvas",
    noFavorites: "Nenhum favorito ainda",
    favoriteHint: "Toque no coração de uma história para guardar aqui e acessar rapidinho.",
    exploreStories: "Explorar histórias",
    hello: "Olá!",
    profileSub: "Continue sua jornada pelas histórias da Bíblia",
    started: "Iniciadas",
    favoriteStat: "Favoritas",
    available: "Disponíveis",
    progress: "Progresso geral",
    complete: "completo",
    master: "🎉 Você é um Mestre! Coloriu tudinho.",
    resume: "Retome de onde você parou",
    noStarted: "Você ainda não começou nenhuma história. Que tal começar agora?",
    viewFavorites: "Ver favoritos",
    exploreAll: "Explorar todas as histórias",
    continue: "Continuar",
    completed: "Concluído",
    addFavorite: "Adicionar aos favoritos",
    removeFavorite: "Remover dos favoritos",
    pagesColored: "páginas coloridas",
    totalColored: "Você já coloriu {done} de {total} páginas",
    missingMilestone: "Faltam {pct}% para a conquista",
    admin: "Admin",
    adminPanel: "Painel SaaS premium",
    dashboard: "Dashboard",
    users: "Usuários",
    reports: "Relatórios",
    languages: "Idiomas",
    webhooks: "Webhooks",
    logout: "Sair",
    overview: "Visão geral",
    dashboardSub:
      "Vendas, planos, recorrência, usuários, idiomas e integrações em uma visão executiva.",
    salesMonth: "Vendas do mês",
    paidSales: "{count} vendas pagas",
    championPlan: "Plano campeão",
    bestSellingMonth: "Mais vendido no mês",
    recurrence: "Recorrência",
    activeSubscriptions: "Assinaturas ativas",
    latestProfiles: "Últimos perfis cadastrados",
    topSellingPlans: "Planos que mais venderam",
    noSalesMonth: "Nenhuma venda registrada neste mês.",
    monthlyRecurrence: "Recorrência dos meses",
    noActiveRecurring: "Nenhuma assinatura recorrente ativa.",
    userCreation: "Criação de usuário",
    name: "Nome",
    email: "Email",
    initialPassword: "Senha inicial",
    createUser: "Criar usuário",
    creating: "Criando...",
    changeUserPassword: "Trocar senha do usuário",
    selectUser: "Selecione um usuário",
    newPassword: "Nova senha",
    saving: "Salvando...",
    changePassword: "Trocar senha",
    nativeAppLanguage: "Idioma nativo do app",
    perfectPayIntegration: "Integração PerfectPay",
    copyWebhook: "Copiar webhook",
    back: "Voltar",
    storyNotFound: "História não encontrada.",
    backHome: "Voltar ao início",
    pageSingular: "página",
    pagePlural: "páginas",
    percentCompleted: "{pct}% concluído",
    startColoring: "Começar a colorir",
    favorited: "Favoritado",
    chooseScene: "Escolha uma cena",
    chooseSceneHint: "Toque em qualquer página para começar a colorir",
    colored: "coloridas",
    pageLabel: "Página {page}",
    pageDone: "Página {page} — concluída",
    pageCurrent: "Página {page} — última aberta",
    done: "Concluída",
    here: "Aqui",
    pages: "Páginas",
    chooseOneOf: "Escolha uma das {total}",
    openPage: "Abrir página {page}",
    previousPage: "Página anterior",
    nextPage: "Próxima página",
    colorSuggestion: "Sugestão de cores",
    suggestion: "Sugestão",
    closeSuggestion: "Fechar sugestão",
    signature: "Assinatura",
    childName: "Nome da criança",
    cancel: "Cancelar",
    save: "Salvar",
    invalidName: "Nome inválido",
    typeName: "Digite um nome",
    useUpToLetters: "Use até 24 letras",
    lettersOnly: "Use apenas letras",
    activateSound: "Ativar som",
    mute: "Silenciar",
    activatePaintingSound: "Ativar som de pintura",
    mutePaintingSound: "Silenciar som de pintura",
    download: "Baixar",
    downloadImage: "Baixar imagem",
    openActions: "Abrir ações",
    actions: "Ações",
    undo: "Desfazer",
    clearAll: "Apagar tudo",
    addSignature: "Adicionar assinatura",
    hideColorSuggestion: "Ocultar sugestão de cores",
    showColorSuggestion: "Mostrar sugestão de cores",
    magicPaint: "Pintura mágica",
    magicPaintApply: "Pintura mágica: aplicar cores sugeridas",
    magic: "Mágica",
    painting: "Pintando…",
    eraser: "Borracha",
    colorLabel: "Cor {color}",
    pageOf: "Página {page} de {total}",
    checkPainting: "Verificar pintura",
    checkPaintingHint: "Toque para conferir se você terminou esta página!",
    pageReady: "Pintura completa! Vamos conferir?",
    missingAreas: "Faltam {n}",
    missingAreasOne: "Falta 1 área para terminar",
    missingAreasMany: "Faltam {n} áreas para terminar",
    showMissing: "Mostrar o que falta",
    missingHighlightHint: "Veja onde ainda falta colorir!",
    alreadyDone: "Já terminei!",
    alreadyDoneHint: "Marca esta página como concluída!",
  },
  "en-US": {
    stories: "Stories",
    storiesBreadcrumb: "Back to the story list",
    featured: "Featured",
    colorNow: "Color now",
    continueColoring: "Continue coloring",
    whereStopped: "Where you left off",
    oldTestament: "Old Testament",
    faithAdventures: "Adventures of faith and courage",
    newTestament: "New Testament",
    jesusTeachings: "The life and teachings of Jesus",
    parables: "Parables",
    parablesSub: "Lessons Jesus taught",
    favorites: "Favorites",
    yourFavorites: "Your favorites",
    favoriteStories: "Stories you love most",
    home: "Home",
    search: "Search",
    profile: "Profile",
    news: "New releases",
    newsHint: "New themes appear here automatically when a story is added.",
    newTheme: "New theme added",
    noNews: "No new themes right now.",
    searchStories: "Search stories",
    searchHint: "Find a story by name, character or Bible theme",
    searchPlaceholder: "Ex: Noah, Jesus, whale…",
    result: "result",
    results: "results",
    availableOne: "story available",
    availableMany: "stories available",
    noStoryFound: "No story found",
    tryAnother: "Try another name or Bible character.",
    savedEmpty: "Your saved stories appear here",
    savedOne: "saved story",
    savedMany: "saved stories",
    noFavorites: "No favorites yet",
    favoriteHint: "Tap the heart on a story to save it here.",
    exploreStories: "Explore stories",
    hello: "Hi there!",
    profileSub: "Continue your journey through Bible stories",
    started: "Started",
    favoriteStat: "Favorites",
    available: "Available",
    progress: "Overall progress",
    complete: "complete",
    master: "🎉 You are a Master! You colored everything.",
    resume: "Pick up where you left off",
    noStarted: "You haven't started a story yet. How about starting now?",
    viewFavorites: "View favorites",
    exploreAll: "Explore all stories",
    continue: "Continue",
    completed: "Completed",
    addFavorite: "Add to favorites",
    removeFavorite: "Remove from favorites",
    pagesColored: "colored pages",
    totalColored: "You colored {done} of {total} pages",
    missingMilestone: "{pct}% left to unlock",
  },
  "es-ES": {
    stories: "Historias",
    storiesBreadcrumb: "Volver a la lista de historias",
    featured: "Destacado",
    colorNow: "Colorear ahora",
    continueColoring: "Seguir coloreando",
    whereStopped: "Donde te detuviste",
    oldTestament: "Antiguo Testamento",
    faithAdventures: "Aventuras de fe y valentía",
    newTestament: "Nuevo Testamento",
    jesusTeachings: "La vida y enseñanzas de Jesús",
    parables: "Parábolas",
    parablesSub: "Lecciones que Jesús enseñó",
    favorites: "Favoritos",
    yourFavorites: "Tus favoritos",
    favoriteStories: "Las historias que más amas",
    home: "Inicio",
    search: "Buscar",
    profile: "Perfil",
    news: "Novedades",
    newsHint: "Los nuevos temas aparecen aquí automáticamente cuando se agrega una historia.",
    newTheme: "Nuevo tema agregado",
    noNews: "No hay temas nuevos por ahora.",
    searchStories: "Buscar historias",
    searchHint: "Encuentra una historia por nombre, personaje o tema bíblico",
    searchPlaceholder: "Ej: Noé, Jesús, ballena…",
    result: "resultado",
    results: "resultados",
    availableOne: "historia disponible",
    availableMany: "historias disponibles",
    noStoryFound: "No se encontró ninguna historia",
    tryAnother: "Prueba otro nombre o personaje bíblico.",
    savedEmpty: "Tus historias guardadas aparecen aquí",
    savedOne: "historia guardada",
    savedMany: "historias guardadas",
    noFavorites: "Aún no hay favoritos",
    favoriteHint: "Toca el corazón de una historia para guardarla aquí.",
    exploreStories: "Explorar historias",
    hello: "¡Hola!",
    profileSub: "Continúa tu viaje por las historias bíblicas",
    started: "Iniciadas",
    favoriteStat: "Favoritas",
    available: "Disponibles",
    progress: "Progreso general",
    complete: "completo",
    master: "🎉 ¡Eres un Maestro! Lo coloreaste todo.",
    resume: "Retoma donde te quedaste",
    noStarted: "Aún no comenzaste ninguna historia. ¿Qué tal empezar ahora?",
    viewFavorites: "Ver favoritos",
    exploreAll: "Explorar todas las historias",
    continue: "Continuar",
    completed: "Completado",
    addFavorite: "Agregar a favoritos",
    removeFavorite: "Quitar de favoritos",
    pagesColored: "páginas coloreadas",
    totalColored: "Ya coloreaste {done} de {total} páginas",
    missingMilestone: "Falta {pct}% para la conquista",
    admin: "Admin",
    adminPanel: "Panel SaaS premium",
    dashboard: "Panel",
    users: "Usuarios",
    reports: "Informes",
    languages: "Idiomas",
    webhooks: "Webhooks",
    logout: "Salir",
    overview: "Vista general",
    dashboardSub:
      "Ventas, planes, recurrencia, usuarios, idiomas e integraciones en una vista ejecutiva.",
    salesMonth: "Ventas del mes",
    paidSales: "{count} ventas pagadas",
    championPlan: "Plan líder",
    bestSellingMonth: "Más vendido del mes",
    recurrence: "Recurrencia",
    activeSubscriptions: "Suscripciones activas",
    latestProfiles: "Últimos perfiles registrados",
    topSellingPlans: "Planes más vendidos",
    noSalesMonth: "No hay ventas registradas este mes.",
    monthlyRecurrence: "Recurrencia mensual",
    noActiveRecurring: "No hay suscripciones recurrentes activas.",
    userCreation: "Creación de usuario",
    name: "Nombre",
    email: "Email",
    initialPassword: "Contraseña inicial",
    createUser: "Crear usuario",
    creating: "Creando...",
    changeUserPassword: "Cambiar contraseña del usuario",
    selectUser: "Selecciona un usuario",
    newPassword: "Nueva contraseña",
    saving: "Guardando...",
    changePassword: "Cambiar contraseña",
    nativeAppLanguage: "Idioma nativo de la app",
    perfectPayIntegration: "Integración PerfectPay",
    copyWebhook: "Copiar webhook",
  },
  "fr-FR": {},
  "de-DE": {},
  "it-IT": {},
} as const;

const adminCopy = {
  "pt-BR": {
    qaCovers: "QA de Capas",
    viewAsUser: "Ver como usuário",
    backToPanel: "Voltar ao painel",
    customRange: "Período personalizado",
    customerOperations: "Customer operations",
    usersSub:
      "Gerencie assinaturas, acesso, senhas e histórico de pagamentos em uma visão premium.",
    exportCsv: "Exportar CSV",
    filteredUsers: "Usuários filtrados",
    updatingList: "Atualizando lista",
    currentResult: "Resultado atual",
    accessReleased: "Com acesso liberado",
    blockedAccesses: "Acessos bloqueados",
    usersWithoutRelease: "Usuários sem liberação",
    displayedRevenue: "Receita exibida",
    totalPaidList: "Total pago na lista",
    searchUsersPlaceholder: "Buscar por nome, email ou ID",
    allStatuses: "Todos os status",
    activeSubscription: "Assinatura ativa",
    pending: "Pendente",
    canceled: "Cancelada",
    noSubscription: "Sem assinatura",
    all: "Todos",
    active: "Ativos",
    canceledPlural: "Cancelados",
    noPlan: "Sem plano",
    noUsersFound: "Nenhum usuário encontrado com os filtros atuais.",
    selectUserDetails: "Selecione um usuário para ver os detalhes.",
    user: "Usuário",
    plan: "Plano",
    totalPaid: "Total pago",
    copied: "{label} copiado",
    actionFailed: "Não foi possível executar a ação",
    clientSince: "Cliente desde {date}",
    copyEmail: "Copiar email",
    copyId: "Copiar ID",
    status: "Status",
    nextBilling: "Próxima cobrança",
    noDate: "Sem data",
    quickActions: "Ações rápidas",
    passwordChanged: "Senha alterada",
    assignPlan: "Atribuir plano",
    planAssigned: "Plano atribuído",
    accessDisabled: "Acesso desativado",
    accessEnabled: "Acesso ativado",
    disableAccess: "Desativar acesso",
    enableAccess: "Ativar acesso",
    paymentHistory: "Histórico de pagamentos",
    noPaymentsUser: "Nenhum pagamento registrado para este usuário.",
    payment: "Pagamento",
    blocked: "Bloqueado",
    businessIntelligence: "Business intelligence",
    reportsSub: "Métricas essenciais para acompanhar vendas, recorrência, planos e saúde do SaaS.",
    refresh: "Atualizar",
    refreshing: "Atualizando...",
    today: "Hoje",
    days7: "7 dias",
    days30: "30 dias",
    days90: "90 dias",
    month: "Mês",
    periodRevenue: "Receita do período",
    monthSales: "Vendas do mês",
    mrrEstimated: "MRR estimado",
    averageTicket: "Ticket médio",
    salesCount: "{count} vendas",
    paidSalesPlain: "{count} vendas pagas",
    averageSelectedPeriod: "Média do período selecionado",
    revenueSalesVolume: "Receita e volume de vendas",
    revenue: "Receita",
    sales: "Vendas",
    executiveSummary: "Resumo executivo",
    revenueLast7Days: "Receita últimos 7 dias",
    salesToday: "Vendas hoje",
    canceledSubscriptions: "Assinaturas canceladas",
    registeredUsers: "Usuários cadastrados",
    activePlans: "Planos ativos",
    bestSellingPlans: "Planos mais vendidos",
    subscriptionStatus: "Status das assinaturas",
    subscriptions: "Assinaturas",
    planRanking: "Ranking de planos",
    recentSales: "Vendas recentes",
    noPaidSalesPeriod: "Nenhuma venda paga encontrada no período.",
    noRecentSales: "Nenhuma venda recente registrada.",
    noData: "sem dados",
    noEmail: "Sem email",
    branding: "Branding",
    emailTemplates: "Templates de e-mail",
  },
  "en-US": {
    qaCovers: "Cover QA",
    customRange: "Custom range",
    customerOperations: "Customer operations",
    usersSub: "Manage subscriptions, access, passwords and payment history in a premium view.",
    exportCsv: "Export CSV",
    filteredUsers: "Filtered users",
    updatingList: "Updating list",
    currentResult: "Current result",
    accessReleased: "Access enabled",
    blockedAccesses: "Blocked access",
    usersWithoutRelease: "Users without access",
    displayedRevenue: "Displayed revenue",
    totalPaidList: "Total paid in list",
    searchUsersPlaceholder: "Search by name, email or ID",
    allStatuses: "All statuses",
    activeSubscription: "Active subscription",
    pending: "Pending",
    canceled: "Canceled",
    noSubscription: "No subscription",
    all: "All",
    active: "Active",
    canceledPlural: "Canceled",
    noPlan: "No plan",
    noUsersFound: "No users found with the current filters.",
    selectUserDetails: "Select a user to view details.",
    user: "User",
    plan: "Plan",
    totalPaid: "Total paid",
    copied: "{label} copied",
    actionFailed: "Could not run the action",
    clientSince: "Client since {date}",
    copyEmail: "Copy email",
    copyId: "Copy ID",
    status: "Status",
    nextBilling: "Next billing",
    noDate: "No date",
    quickActions: "Quick actions",
    passwordChanged: "Password changed",
    assignPlan: "Assign plan",
    planAssigned: "Plan assigned",
    accessDisabled: "Access disabled",
    accessEnabled: "Access enabled",
    disableAccess: "Disable access",
    enableAccess: "Enable access",
    paymentHistory: "Payment history",
    noPaymentsUser: "No payment registered for this user.",
    payment: "Payment",
    blocked: "Blocked",
    admin: "Admin",
    adminPanel: "Premium SaaS panel",
    dashboard: "Dashboard",
    users: "Users",
    reports: "Reports",
    languages: "Languages",
    webhooks: "Webhooks",
    logout: "Log out",
    businessIntelligence: "Business intelligence",
    reportsSub: "Essential metrics to track sales, recurring revenue, plans and SaaS health.",
    refresh: "Refresh",
    refreshing: "Refreshing...",
    today: "Today",
    days7: "7 days",
    days30: "30 days",
    days90: "90 days",
    month: "Month",
    periodRevenue: "Period revenue",
    monthSales: "Month sales",
    mrrEstimated: "Estimated MRR",
    averageTicket: "Average ticket",
    salesCount: "{count} sales",
    paidSalesPlain: "{count} paid sales",
    averageSelectedPeriod: "Average for selected period",
    revenueSalesVolume: "Revenue and sales volume",
    revenue: "Revenue",
    sales: "Sales",
    executiveSummary: "Executive summary",
    championPlan: "Champion plan",
    revenueLast7Days: "Revenue last 7 days",
    salesToday: "Sales today",
    canceledSubscriptions: "Canceled subscriptions",
    registeredUsers: "Registered users",
    activePlans: "Active plans",
    bestSellingPlans: "Best-selling plans",
    subscriptionStatus: "Subscription status",
    subscriptions: "Subscriptions",
    planRanking: "Plan ranking",
    recentSales: "Recent sales",
    noPaidSalesPeriod: "No paid sales found in the period.",
    noRecentSales: "No recent sales recorded.",
    noData: "no data",
    noEmail: "No email",
    branding: "Branding",
    emailTemplates: "Email templates",
  },
  "es-ES": {
    qaCovers: "QA de Portadas",
    customRange: "Rango personalizado",
    customerOperations: "Operaciones de clientes",
    usersSub:
      "Gestiona suscripciones, acceso, contraseñas e historial de pagos en una vista premium.",
    exportCsv: "Exportar CSV",
    filteredUsers: "Usuarios filtrados",
    updatingList: "Actualizando lista",
    currentResult: "Resultado actual",
    accessReleased: "Con acceso habilitado",
    blockedAccesses: "Accesos bloqueados",
    usersWithoutRelease: "Usuarios sin liberación",
    displayedRevenue: "Ingresos mostrados",
    totalPaidList: "Total pagado en la lista",
    searchUsersPlaceholder: "Buscar por nombre, email o ID",
    allStatuses: "Todos los estados",
    activeSubscription: "Suscripción activa",
    pending: "Pendiente",
    canceled: "Cancelada",
    noSubscription: "Sin suscripción",
    all: "Todos",
    active: "Activos",
    canceledPlural: "Cancelados",
    noPlan: "Sin plan",
    noUsersFound: "No se encontraron usuarios con los filtros actuales.",
    selectUserDetails: "Selecciona un usuario para ver los detalles.",
    user: "Usuario",
    plan: "Plan",
    totalPaid: "Total pagado",
    copied: "{label} copiado",
    actionFailed: "No fue posible ejecutar la acción",
    clientSince: "Cliente desde {date}",
    copyEmail: "Copiar email",
    copyId: "Copiar ID",
    status: "Estado",
    nextBilling: "Próximo cobro",
    noDate: "Sin fecha",
    quickActions: "Acciones rápidas",
    passwordChanged: "Contraseña cambiada",
    assignPlan: "Asignar plan",
    planAssigned: "Plan asignado",
    accessDisabled: "Acceso desactivado",
    accessEnabled: "Acceso activado",
    disableAccess: "Desactivar acceso",
    enableAccess: "Activar acceso",
    paymentHistory: "Historial de pagos",
    noPaymentsUser: "No hay pagos registrados para este usuario.",
    payment: "Pago",
    blocked: "Bloqueado",
    businessIntelligence: "Inteligencia de negocio",
    reportsSub: "Métricas esenciales para seguir ventas, recurrencia, planes y salud del SaaS.",
    refresh: "Actualizar",
    refreshing: "Actualizando...",
    today: "Hoy",
    days7: "7 días",
    days30: "30 días",
    days90: "90 días",
    month: "Mes",
    periodRevenue: "Ingresos del período",
    monthSales: "Ventas del mes",
    mrrEstimated: "MRR estimado",
    averageTicket: "Ticket promedio",
    salesCount: "{count} ventas",
    paidSalesPlain: "{count} ventas pagadas",
    averageSelectedPeriod: "Promedio del período seleccionado",
    revenueSalesVolume: "Ingresos y volumen de ventas",
    revenue: "Ingresos",
    sales: "Ventas",
    executiveSummary: "Resumen ejecutivo",
    revenueLast7Days: "Ingresos últimos 7 días",
    salesToday: "Ventas hoy",
    canceledSubscriptions: "Suscripciones canceladas",
    registeredUsers: "Usuarios registrados",
    activePlans: "Planes activos",
    bestSellingPlans: "Planes más vendidos",
    subscriptionStatus: "Estado de suscripciones",
    subscriptions: "Suscripciones",
    planRanking: "Ranking de planes",
    recentSales: "Ventas recientes",
    noPaidSalesPeriod: "No se encontraron ventas pagadas en el período.",
    noRecentSales: "No hay ventas recientes registradas.",
    noData: "sin datos",
    noEmail: "Sin email",
    branding: "Branding",
    emailTemplates: "Plantillas de correo",
  },
  "fr-FR": {
    customerOperations: "Opérations clients",
    users: "Utilisateurs",
    reports: "Rapports",
    usersSub:
      "Gérez les abonnements, l’accès, les mots de passe et l’historique des paiements dans une vue premium.",
    exportCsv: "Exporter CSV",
    filteredUsers: "Utilisateurs filtrés",
    updatingList: "Mise à jour de la liste",
    currentResult: "Résultat actuel",
    activeSubscriptions: "Abonnements actifs",
    accessReleased: "Accès autorisé",
    blockedAccesses: "Accès bloqués",
    usersWithoutRelease: "Utilisateurs sans accès",
    displayedRevenue: "Revenu affiché",
    totalPaidList: "Total payé dans la liste",
    searchUsersPlaceholder: "Rechercher par nom, email ou ID",
    allStatuses: "Tous les statuts",
    activeSubscription: "Abonnement actif",
    pending: "En attente",
    canceled: "Annulé",
    noSubscription: "Sans abonnement",
    all: "Tous",
    active: "Actifs",
    canceledPlural: "Annulés",
    noPlan: "Sans forfait",
    noUsersFound: "Aucun utilisateur trouvé avec les filtres actuels.",
    selectUserDetails: "Sélectionnez un utilisateur pour voir les détails.",
    user: "Utilisateur",
    plan: "Forfait",
    totalPaid: "Total payé",
    copied: "{label} copié",
    actionFailed: "Impossible d’exécuter l’action",
    clientSince: "Client depuis le {date}",
    copyEmail: "Copier l’email",
    copyId: "Copier l’ID",
    status: "Statut",
    nextBilling: "Prochaine facturation",
    noDate: "Sans date",
    quickActions: "Actions rapides",
    newPassword: "Nouveau mot de passe",
    passwordChanged: "Mot de passe modifié",
    changePassword: "Changer le mot de passe",
    assignPlan: "Attribuer un forfait",
    planAssigned: "Forfait attribué",
    accessDisabled: "Accès désactivé",
    accessEnabled: "Accès activé",
    disableAccess: "Désactiver l’accès",
    enableAccess: "Activer l’accès",
    paymentHistory: "Historique des paiements",
    noPaymentsUser: "Aucun paiement enregistré pour cet utilisateur.",
    payment: "Paiement",
    blocked: "Bloqué",
    admin: "Admin",
    adminPanel: "Panneau SaaS premium",
    dashboard: "Tableau de bord",
    languages: "Langues",
    webhooks: "Webhooks",
    logout: "Sortir",
    businessIntelligence: "Business intelligence",
    reportsSub:
      "Métriques essentielles pour suivre les ventes, la récurrence, les forfaits et la santé du SaaS.",
    refresh: "Actualiser",
    refreshing: "Actualisation...",
    today: "Aujourd’hui",
    days7: "7 jours",
    days30: "30 jours",
    days90: "90 jours",
    month: "Mois",
    periodRevenue: "Revenu de la période",
    monthSales: "Ventes du mois",
    mrrEstimated: "MRR estimé",
    averageTicket: "Ticket moyen",
    salesCount: "{count} ventes",
    paidSalesPlain: "{count} ventes payées",
    averageSelectedPeriod: "Moyenne de la période sélectionnée",
    revenueSalesVolume: "Revenu et volume de ventes",
    revenue: "Revenu",
    sales: "Ventes",
    executiveSummary: "Résumé exécutif",
    championPlan: "Forfait champion",
    revenueLast7Days: "Revenu des 7 derniers jours",
    salesToday: "Ventes aujourd’hui",
    canceledSubscriptions: "Abonnements annulés",
    registeredUsers: "Utilisateurs inscrits",
    activePlans: "Forfaits actifs",
    bestSellingPlans: "Forfaits les plus vendus",
    subscriptionStatus: "Statut des abonnements",
    subscriptions: "Abonnements",
    planRanking: "Classement des forfaits",
    recentSales: "Ventes récentes",
    noPaidSalesPeriod: "Aucune vente payée trouvée sur la période.",
    noRecentSales: "Aucune vente récente enregistrée.",
    noData: "sans données",
    noEmail: "Sans email",
  },
  "de-DE": {
    customerOperations: "Kundenbetrieb",
    users: "Benutzer",
    reports: "Berichte",
    usersSub:
      "Verwalten Sie Abos, Zugriff, Passwörter und Zahlungshistorie in einer Premium-Ansicht.",
    exportCsv: "CSV exportieren",
    filteredUsers: "Gefilterte Benutzer",
    updatingList: "Liste wird aktualisiert",
    currentResult: "Aktuelles Ergebnis",
    activeSubscriptions: "Aktive Abos",
    accessReleased: "Zugriff freigegeben",
    blockedAccesses: "Blockierte Zugriffe",
    usersWithoutRelease: "Benutzer ohne Freigabe",
    displayedRevenue: "Angezeigter Umsatz",
    totalPaidList: "Gesamt bezahlt in der Liste",
    searchUsersPlaceholder: "Nach Name, E-Mail oder ID suchen",
    allStatuses: "Alle Status",
    activeSubscription: "Aktives Abo",
    pending: "Ausstehend",
    canceled: "Gekündigt",
    noSubscription: "Kein Abo",
    all: "Alle",
    active: "Aktiv",
    canceledPlural: "Gekündigt",
    noPlan: "Kein Plan",
    noUsersFound: "Keine Benutzer mit den aktuellen Filtern gefunden.",
    selectUserDetails: "Wählen Sie einen Benutzer aus, um Details zu sehen.",
    user: "Benutzer",
    plan: "Plan",
    totalPaid: "Gesamt bezahlt",
    copied: "{label} kopiert",
    actionFailed: "Aktion konnte nicht ausgeführt werden",
    clientSince: "Kunde seit {date}",
    copyEmail: "E-Mail kopieren",
    copyId: "ID kopieren",
    status: "Status",
    nextBilling: "Nächste Abrechnung",
    noDate: "Kein Datum",
    quickActions: "Schnellaktionen",
    newPassword: "Neues Passwort",
    passwordChanged: "Passwort geändert",
    changePassword: "Passwort ändern",
    assignPlan: "Plan zuweisen",
    planAssigned: "Plan zugewiesen",
    accessDisabled: "Zugriff deaktiviert",
    accessEnabled: "Zugriff aktiviert",
    disableAccess: "Zugriff deaktivieren",
    enableAccess: "Zugriff aktivieren",
    paymentHistory: "Zahlungshistorie",
    noPaymentsUser: "Für diesen Benutzer ist keine Zahlung registriert.",
    payment: "Zahlung",
    blocked: "Blockiert",
    admin: "Admin",
    adminPanel: "Premium-SaaS-Panel",
    dashboard: "Dashboard",
    languages: "Sprachen",
    webhooks: "Webhooks",
    logout: "Abmelden",
    businessIntelligence: "Business Intelligence",
    reportsSub: "Wichtige Kennzahlen für Verkäufe, Wiederkehr, Pläne und SaaS-Gesundheit.",
    refresh: "Aktualisieren",
    refreshing: "Aktualisiere...",
    today: "Heute",
    days7: "7 Tage",
    days30: "30 Tage",
    days90: "90 Tage",
    month: "Monat",
    periodRevenue: "Umsatz im Zeitraum",
    monthSales: "Monatsverkäufe",
    mrrEstimated: "Geschätzter MRR",
    averageTicket: "Durchschnittsticket",
    salesCount: "{count} Verkäufe",
    paidSalesPlain: "{count} bezahlte Verkäufe",
    averageSelectedPeriod: "Durchschnitt im ausgewählten Zeitraum",
    revenueSalesVolume: "Umsatz und Verkaufsvolumen",
    revenue: "Umsatz",
    sales: "Verkäufe",
    executiveSummary: "Executive Summary",
    championPlan: "Top-Plan",
    revenueLast7Days: "Umsatz letzte 7 Tage",
    salesToday: "Verkäufe heute",
    canceledSubscriptions: "Gekündigte Abos",
    registeredUsers: "Registrierte Benutzer",
    activePlans: "Aktive Pläne",
    bestSellingPlans: "Meistverkaufte Pläne",
    subscriptionStatus: "Abo-Status",
    subscriptions: "Abos",
    planRanking: "Plan-Ranking",
    recentSales: "Aktuelle Verkäufe",
    noPaidSalesPeriod: "Keine bezahlten Verkäufe im Zeitraum gefunden.",
    noRecentSales: "Keine aktuellen Verkäufe erfasst.",
    noData: "keine Daten",
    noEmail: "Keine E-Mail",
  },
  "it-IT": {
    customerOperations: "Operazioni clienti",
    users: "Utenti",
    reports: "Report",
    usersSub:
      "Gestisci abbonamenti, accessi, password e cronologia pagamenti in una vista premium.",
    exportCsv: "Esporta CSV",
    filteredUsers: "Utenti filtrati",
    updatingList: "Aggiornamento lista",
    currentResult: "Risultato attuale",
    activeSubscriptions: "Abbonamenti attivi",
    accessReleased: "Accesso abilitato",
    blockedAccesses: "Accessi bloccati",
    usersWithoutRelease: "Utenti senza accesso",
    displayedRevenue: "Ricavi visualizzati",
    totalPaidList: "Totale pagato nella lista",
    searchUsersPlaceholder: "Cerca per nome, email o ID",
    allStatuses: "Tutti gli stati",
    activeSubscription: "Abbonamento attivo",
    pending: "In sospeso",
    canceled: "Annullata",
    noSubscription: "Senza abbonamento",
    all: "Tutti",
    active: "Attivi",
    canceledPlural: "Annullati",
    noPlan: "Senza piano",
    noUsersFound: "Nessun utente trovato con i filtri attuali.",
    selectUserDetails: "Seleziona un utente per vedere i dettagli.",
    user: "Utente",
    plan: "Piano",
    totalPaid: "Totale pagato",
    copied: "{label} copiato",
    actionFailed: "Impossibile eseguire l’azione",
    clientSince: "Cliente dal {date}",
    copyEmail: "Copia email",
    copyId: "Copia ID",
    status: "Stato",
    nextBilling: "Prossima fatturazione",
    noDate: "Senza data",
    quickActions: "Azioni rapide",
    newPassword: "Nuova password",
    passwordChanged: "Password modificata",
    changePassword: "Cambia password",
    assignPlan: "Assegna piano",
    planAssigned: "Piano assegnato",
    accessDisabled: "Accesso disattivato",
    accessEnabled: "Accesso attivato",
    disableAccess: "Disattiva accesso",
    enableAccess: "Attiva accesso",
    paymentHistory: "Cronologia pagamenti",
    noPaymentsUser: "Nessun pagamento registrato per questo utente.",
    payment: "Pagamento",
    blocked: "Bloccato",
    admin: "Admin",
    adminPanel: "Pannello SaaS premium",
    dashboard: "Dashboard",
    languages: "Lingue",
    webhooks: "Webhooks",
    logout: "Esci",
    businessIntelligence: "Business intelligence",
    reportsSub: "Metriche essenziali per monitorare vendite, ricorrenza, piani e salute SaaS.",
    refresh: "Aggiorna",
    refreshing: "Aggiornamento...",
    today: "Oggi",
    days7: "7 giorni",
    days30: "30 giorni",
    days90: "90 giorni",
    month: "Mese",
    periodRevenue: "Ricavi del periodo",
    monthSales: "Vendite del mese",
    mrrEstimated: "MRR stimato",
    averageTicket: "Ticket medio",
    salesCount: "{count} vendite",
    paidSalesPlain: "{count} vendite pagate",
    averageSelectedPeriod: "Media del periodo selezionato",
    revenueSalesVolume: "Ricavi e volume vendite",
    revenue: "Ricavi",
    sales: "Vendite",
    executiveSummary: "Riepilogo esecutivo",
    championPlan: "Piano campione",
    revenueLast7Days: "Ricavi ultimi 7 giorni",
    salesToday: "Vendite oggi",
    canceledSubscriptions: "Abbonamenti annullati",
    registeredUsers: "Utenti registrati",
    activePlans: "Piani attivi",
    bestSellingPlans: "Piani più venduti",
    subscriptionStatus: "Stato abbonamenti",
    subscriptions: "Abbonamenti",
    planRanking: "Classifica piani",
    recentSales: "Vendite recenti",
    noPaidSalesPeriod: "Nessuna vendita pagata trovata nel periodo.",
    noRecentSales: "Nessuna vendita recente registrata.",
    noData: "senza dati",
    noEmail: "Senza email",
  },
} as const;

type CopyKey = keyof (typeof copy)["pt-BR"] | keyof (typeof adminCopy)["pt-BR"];

const languageOverrides: Partial<Record<AppLanguage, Partial<Record<CopyKey, string>>>> = {
  "en-US": {
    viewAsUser: "View as user",
    backToPanel: "Back to panel",
    admin: "Admin",
    adminPanel: "Premium SaaS panel",
    dashboard: "Dashboard",
    users: "Users",
    reports: "Reports",
    languages: "Languages",
    webhooks: "Webhooks",
    logout: "Log out",
    overview: "Overview",
    dashboardSub:
      "Sales, plans, recurring revenue, users, languages and integrations in an executive view.",
    salesMonth: "Month sales",
    paidSales: "{count} paid sales",
    championPlan: "Champion plan",
    bestSellingMonth: "Best-selling this month",
    recurrence: "Recurring revenue",
    activeSubscriptions: "Active subscriptions",
    latestProfiles: "Latest registered profiles",
    topSellingPlans: "Top-selling plans",
    noSalesMonth: "No sales recorded this month.",
    monthlyRecurrence: "Monthly recurrence",
    noActiveRecurring: "No active recurring subscription.",
    userCreation: "User creation",
    name: "Name",
    email: "Email",
    initialPassword: "Initial password",
    createUser: "Create user",
    creating: "Creating...",
    changeUserPassword: "Change user password",
    selectUser: "Select a user",
    newPassword: "New password",
    saving: "Saving...",
    changePassword: "Change password",
    nativeAppLanguage: "App native language",
    perfectPayIntegration: "PerfectPay integration",
    copyWebhook: "Copy webhook",
    back: "Back",
    storyNotFound: "Story not found.",
    backHome: "Back home",
    pageSingular: "page",
    pagePlural: "pages",
    percentCompleted: "{pct}% completed",
    startColoring: "Start coloring",
    favorited: "Favorited",
    chooseScene: "Choose a scene",
    chooseSceneHint: "Tap any page to start coloring",
    colored: "colored",
    pageLabel: "Page {page}",
    pageDone: "Page {page} — completed",
    pageCurrent: "Page {page} — last opened",
    done: "Done",
    here: "Here",
    pages: "Pages",
    chooseOneOf: "Choose one of {total}",
    openPage: "Open page {page}",
    previousPage: "Previous page",
    nextPage: "Next page",
    colorSuggestion: "Color suggestion",
    suggestion: "Suggestion",
    closeSuggestion: "Close suggestion",
    signature: "Signature",
    childName: "Child name",
    cancel: "Cancel",
    save: "Save",
    invalidName: "Invalid name",
    typeName: "Enter a name",
    useUpToLetters: "Use up to 24 letters",
    lettersOnly: "Use letters only",
    activateSound: "Turn sound on",
    mute: "Mute",
    activatePaintingSound: "Turn painting sound on",
    mutePaintingSound: "Mute painting sound",
    download: "Download",
    downloadImage: "Download image",
    openActions: "Open actions",
    actions: "Actions",
    undo: "Undo",
    clearAll: "Clear all",
    addSignature: "Add signature",
    hideColorSuggestion: "Hide color suggestion",
    showColorSuggestion: "Show color suggestion",
    magicPaint: "Magic paint",
    magicPaintApply: "Magic paint: apply suggested colors",
    magic: "Magic",
    painting: "Painting…",
    eraser: "Eraser",
    colorLabel: "Color {color}",
    pageOf: "Page {page} of {total}",
    checkPainting: "Check my painting",
    checkPaintingHint: "Tap to see if you finished this page!",
    pageReady: "All painted! Shall we check it?",
    missingAreas: "{n} left",
    missingAreasOne: "1 area left to finish",
    missingAreasMany: "{n} areas left to finish",
    showMissing: "Show what is missing",
    missingHighlightHint: "See where to color next!",
    alreadyDone: "I am done!",
    alreadyDoneHint: "Mark this page as finished!",
  },
  "es-ES": {
    viewAsUser: "Ver como usuario",
    backToPanel: "Volver al panel",
    back: "Volver",
    storyNotFound: "Historia no encontrada.",
    backHome: "Volver al inicio",
    pageSingular: "página",
    pagePlural: "páginas",
    percentCompleted: "{pct}% completado",
    startColoring: "Empezar a colorear",
    favorited: "Favorita",
    chooseScene: "Elige una escena",
    chooseSceneHint: "Toca cualquier página para empezar a colorear",
    colored: "coloreadas",
    pageLabel: "Página {page}",
    pageDone: "Página {page} — completada",
    pageCurrent: "Página {page} — última abierta",
    done: "Completada",
    here: "Aquí",
    pages: "Páginas",
    chooseOneOf: "Elige una de {total}",
    openPage: "Abrir página {page}",
    previousPage: "Página anterior",
    nextPage: "Página siguiente",
    colorSuggestion: "Sugerencia de colores",
    suggestion: "Sugerencia",
    closeSuggestion: "Cerrar sugerencia",
    signature: "Firma",
    childName: "Nombre del niño",
    cancel: "Cancelar",
    save: "Guardar",
    invalidName: "Nombre inválido",
    typeName: "Escribe un nombre",
    useUpToLetters: "Usa hasta 24 letras",
    lettersOnly: "Usa solo letras",
    activateSound: "Activar sonido",
    mute: "Silenciar",
    activatePaintingSound: "Activar sonido de pintura",
    mutePaintingSound: "Silenciar sonido de pintura",
    download: "Descargar",
    downloadImage: "Descargar imagen",
    openActions: "Abrir acciones",
    actions: "Acciones",
    undo: "Deshacer",
    clearAll: "Borrar todo",
    addSignature: "Agregar firma",
    hideColorSuggestion: "Ocultar sugerencia de colores",
    showColorSuggestion: "Mostrar sugerencia de colores",
    magicPaint: "Pintura mágica",
    magicPaintApply: "Pintura mágica: aplicar colores sugeridos",
    magic: "Mágica",
    painting: "Pintando…",
    eraser: "Borrador",
    colorLabel: "Color {color}",
    pageOf: "Página {page} de {total}",
    checkPainting: "Verificar mi pintura",
    checkPaintingHint: "¡Toca para ver si terminaste esta página!",
    pageReady: "¡Pintura completa! ¿La revisamos?",
    missingAreas: "Faltan {n}",
    missingAreasOne: "Falta 1 área para terminar",
    missingAreasMany: "Faltan {n} áreas para terminar",
    showMissing: "Mostrar lo que falta",
    missingHighlightHint: "¡Mira dónde falta colorear!",
    alreadyDone: "¡Ya terminé!",
    alreadyDoneHint: "¡Marca esta página como terminada!",
  },
};

const storyCopy: Partial<
  Record<
    AppLanguage,
    Record<string, Partial<Pick<Story, "title" | "subtitle" | "shortDescription" | "description">>>
  >
> = {
  "en-US": {
    "noe-e-a-arca": {
      title: "Noah's Ark",
      subtitle: "Animals, rain and a beautiful rainbow",
      shortDescription: "Animals, rain and a beautiful rainbow",
      description:
        "Discover how Noah built a huge ark and brought the animals on an adventure full of faith and color.",
    },
    "davi-e-golias": {
      title: "David and Goliath",
      subtitle: "Courage from the heart",
      shortDescription: "Courage from the heart",
      description:
        "A brave boy faces a giant with faith and a small stone. A story about trusting God.",
    },
    "jonas-e-a-baleia": {
      title: "Jonah and the Whale",
      subtitle: "An adventure deep in the sea",
      shortDescription: "An adventure deep in the sea",
      description:
        "Jonah lived an unexpected journey inside a great whale and learned about obedience and love.",
    },
    "moises-e-o-mar-vermelho": {
      title: "Moses and the Red Sea",
      subtitle: "The path opened by faith",
      shortDescription: "The path opened by faith",
      description:
        "Moses led his people through a path opened in the middle of the sea. A story full of miracle and hope.",
    },
    "daniel-na-cova-dos-leoes": {
      title: "Daniel in the Lions' Den",
      subtitle: "Faith that protects",
      shortDescription: "Faith that protects",
      description:
        "Daniel prayed and God cared for him among the lions. A story of gentle courage and protection.",
    },
    "o-nascimento-de-jesus": {
      title: "The Birth of Jesus",
      subtitle: "The most beautiful night of all",
      shortDescription: "The most beautiful night of all",
      description:
        "In a manger, under a shining star, Jesus was born. The most loved story in the Bible.",
    },
    "jesus-e-as-criancas": {
      title: "Jesus and the Children",
      subtitle: "Come to me, little ones",
      shortDescription: "Come to me, little ones",
      description: "Jesus loved children very much. Meet this sweet story full of care.",
    },
    "a-multiplicacao-dos-paes": {
      title: "The Multiplication of the Loaves",
      subtitle: "Bread and fish for everyone",
      shortDescription: "Bread and fish for everyone",
      description: "Jesus fed a crowd with a few loaves and fish. A miracle of sharing and love.",
    },
    "o-bom-samaritano": {
      title: "The Good Samaritan",
      subtitle: "Helping with the heart",
      shortDescription: "Helping with the heart",
      description:
        "A story about loving your neighbor and caring for those in need, just as Jesus taught.",
    },
    "a-criacao-do-mundo": {
      title: "The Creation of the World",
      subtitle: "In seven days, everything became beautiful",
      shortDescription: "In seven days, everything became beautiful",
      description:
        "God created the sky, the earth, the animals and the children. A story full of colors and wonders.",
    },
    "jesus-acalma-a-tempestade": {
      title: "Jesus Calms the Storm",
      subtitle: "Peace in the middle of the wind",
      shortDescription: "Peace in the middle of the wind",
      description:
        "Jesus shows that faith brings calm even when the boat rocks and the waves seem big.",
    },
    "ester-rainha-corajosa": {
      title: "Esther, Brave Queen",
      subtitle: "Courage to do good",
      shortDescription: "Courage to do good",
      description:
        "Esther trusts God and uses her courage to protect her people with wisdom and love.",
    },
    "o-filho-prodigo": {
      title: "The Prodigal Son",
      subtitle: "The hug of forgiveness",
      shortDescription: "The hug of forgiveness",
      description:
        "A parable about coming home, receiving forgiveness and discovering the size of the Father's love.",
    },
    "a-ovelha-perdida": {
      title: "The Lost Sheep",
      subtitle: "The shepherd who searches",
      shortDescription: "The shepherd who searches",
      description:
        "Jesus teaches that every person is precious, like a little sheep found with joy.",
    },
    "o-semeador": {
      title: "The Sower",
      subtitle: "Seeds in the heart",
      shortDescription: "Seeds in the heart",
      description: "A parable about hearing God's Word and letting good things grow in the heart.",
    },
    "a-casa-na-rocha": {
      title: "The House on the Rock",
      subtitle: "Firm in the Word",
      shortDescription: "Firm in the Word",
      description:
        "Jesus tells about a safe house on the rock to teach obedience, wisdom and trust.",
    },
  },
  "es-ES": {
    "noe-e-a-arca": {
      title: "El Arca de Noé",
      subtitle: "Animales, lluvia y un hermoso arcoíris",
      shortDescription: "Animales, lluvia y un hermoso arcoíris",
      description:
        "Descubre cómo Noé construyó un arca enorme y llevó a los animales en una aventura llena de fe y color.",
    },
    "davi-e-golias": {
      title: "David y Goliat",
      subtitle: "Valentía que nace del corazón",
      shortDescription: "Valentía que nace del corazón",
      description:
        "Un niño valiente enfrenta a un gigante con fe y una piedrita. Una historia de confianza en Dios.",
    },
    "jonas-e-a-baleia": {
      title: "Jonás y la Ballena",
      subtitle: "Una aventura en el fondo del mar",
      shortDescription: "Una aventura en el fondo del mar",
      description:
        "Jonás vivió un viaje inesperado dentro de una gran ballena y aprendió sobre obediencia y amor.",
    },
    "moises-e-o-mar-vermelho": {
      title: "Moisés y el Mar Rojo",
      subtitle: "El camino que se abrió por la fe",
      shortDescription: "El camino que se abrió por la fe",
      description:
        "Moisés guio a su pueblo por un camino abierto en medio del mar. Una historia llena de milagro y esperanza.",
    },
    "daniel-na-cova-dos-leoes": {
      title: "Daniel en el Foso de los Leones",
      subtitle: "Fe que protege",
      shortDescription: "Fe que protege",
      description:
        "Daniel oró y Dios lo cuidó entre los leones. Una historia de valentía tranquila y protección.",
    },
    "o-nascimento-de-jesus": {
      title: "El Nacimiento de Jesús",
      subtitle: "La noche más hermosa de todas",
      shortDescription: "La noche más hermosa de todas",
      description:
        "En un pesebre, bajo una estrella brillante, nació Jesús. La historia más amada de la Biblia.",
    },
    "jesus-e-as-criancas": {
      title: "Jesús y los Niños",
      subtitle: "Vengan a mí, pequeños",
      shortDescription: "Vengan a mí, pequeños",
      description: "Jesús amaba mucho a los niños. Conoce esta historia dulce y llena de cariño.",
    },
    "a-multiplicacao-dos-paes": {
      title: "La Multiplicación de los Panes",
      subtitle: "Pan y peces para todos",
      shortDescription: "Pan y peces para todos",
      description:
        "Jesús alimentó a una multitud con pocos panes y peces. Un milagro de compartir y amar.",
    },
    "o-bom-samaritano": {
      title: "El Buen Samaritano",
      subtitle: "Ayudar con el corazón",
      shortDescription: "Ayudar con el corazón",
      description:
        "Una historia sobre amar al prójimo y cuidar de quien lo necesita, como Jesús enseñó.",
    },
    "a-criacao-do-mundo": {
      title: "La Creación del Mundo",
      subtitle: "En siete días, todo quedó hermoso",
      shortDescription: "En siete días, todo quedó hermoso",
      description:
        "Dios creó el cielo, la tierra, los animales y los niños. Una historia llena de colores y maravillas.",
    },
    "jesus-acalma-a-tempestade": {
      title: "Jesús Calma la Tormenta",
      subtitle: "Paz en medio del viento",
      shortDescription: "Paz en medio del viento",
      description:
        "Jesús muestra que la fe trae calma incluso cuando el barco se mueve y las olas parecen grandes.",
    },
    "ester-rainha-corajosa": {
      title: "Ester, Reina Valiente",
      subtitle: "Valentía para hacer el bien",
      shortDescription: "Valentía para hacer el bien",
      description:
        "Ester confía en Dios y usa su valentía para proteger a su pueblo con sabiduría y amor.",
    },
    "o-filho-prodigo": {
      title: "El Hijo Pródigo",
      subtitle: "El abrazo del perdón",
      shortDescription: "El abrazo del perdón",
      description:
        "Una parábola sobre volver a casa, recibir perdón y descubrir el tamaño del amor del Padre.",
    },
    "a-ovelha-perdida": {
      title: "La Oveja Perdida",
      subtitle: "El pastor que busca",
      shortDescription: "El pastor que busca",
      description:
        "Jesús enseña que cada persona es preciosa, como una ovejita encontrada con alegría.",
    },
    "o-semeador": {
      title: "El Sembrador",
      subtitle: "Semillas en el corazón",
      shortDescription: "Semillas en el corazón",
      description:
        "Una parábola sobre escuchar la Palabra de Dios y dejar que cosas buenas crezcan en el corazón.",
    },
    "a-casa-na-rocha": {
      title: "La Casa sobre la Roca",
      subtitle: "Firmes en la Palabra",
      shortDescription: "Firmes en la Palabra",
      description:
        "Jesús cuenta sobre una casa segura sobre la roca para enseñar obediencia, sabiduría y confianza.",
    },
  },
};

const categoryCopy: Partial<
  Record<AppLanguage, Record<string, Partial<Pick<Category, "name" | "description">>>>
> = {
  "en-US": {
    criacao: { name: "Creation" },
    herois: { name: "Bible Heroes" },
    milagres: { name: "Jesus' Miracles" },
    parabolas: { name: "Parables" },
    animais: { name: "Bible Animals" },
    antigo: { name: "Old Testament" },
    novo: { name: "New Testament" },
    amadas: { name: "Most loved" },
  },
  "es-ES": {
    criacao: { name: "Creación" },
    herois: { name: "Héroes de la Biblia" },
    milagres: { name: "Milagros de Jesús" },
    parabolas: { name: "Parábolas" },
    animais: { name: "Animales de la Biblia" },
    antigo: { name: "Antiguo Testamento" },
    novo: { name: "Nuevo Testamento" },
    amadas: { name: "Más amadas" },
  },
};

export function getLanguage(): AppLanguage {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  const stored = localStorage.getItem(LANGUAGE_KEY) as AppLanguage | null;
  return stored && SUPPORTED_LANGUAGES.includes(stored) ? stored : DEFAULT_LANGUAGE;
}

/**
 * Janela (ms) durante a qual consideramos o app em "troca de idioma".
 * Pequena o bastante para não atrapalhar o uso normal, longa o bastante
 * para englobar a re-renderização das telas reativas (cards, FAB,
 * cabeçalhos) após o evento `ccj-language-changed`.
 */
const LANGUAGE_SWITCHING_WINDOW_MS = 700;

/**
 * Fila global de mudanças de idioma. Garante que se o usuário clicar
 * em outro idioma DURANTE a janela de atualização, a última seleção
 * será aplicada automaticamente assim que a atual terminar.
 *
 * Estado em escopo de módulo (singleton por documento) — proposital,
 * para coordenar todas as origens de `setLanguage` no app sem precisar
 * de Context/Redux. Eventos `ccj-language-changed` continuam sendo a
 * fonte de verdade que telas reativas escutam.
 */
let switchingTimeoutId: number | null = null;
let pendingQueuedLanguage: AppLanguage | null = null;
/**
 * Idioma ativo no momento em que a janela ATUAL de "switching" foi
 * aberta. Usado por `cancelLanguageSwitch()` para reverter o app à
 * última escolha estável quando o usuário desiste no meio da troca.
 * É `null` fora da janela.
 */
let preSwitchLanguage: AppLanguage | null = null;

function isSwitchingActive(): boolean {
  return switchingTimeoutId !== null;
}

function applyLanguageNow(language: AppLanguage, options?: { isRevert?: boolean }) {
  const safeLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  // Captura o idioma anterior ANTES de sobrescrever o storage — usado
  // tanto para `preSwitchLanguage` (cancelamento) quanto para o histórico
  // persistente exibido no perfil.
  const previousLanguage = getLanguage();
  // Captura o idioma "estável" ANTES de qualquer dispatch, mas só na
  // primeira aplicação de uma sequência (não em flushes da fila nem em
  // reversões iniciadas pelo cancelamento). Garante que `cancelLanguage
  // Switch()` sempre saiba para onde voltar.
  if (!options?.isRevert && preSwitchLanguage === null) {
    preSwitchLanguage = previousLanguage;
  }
  localStorage.setItem(LANGUAGE_KEY, safeLanguage);
  // Marca que a escolha veio do usuário, para não ser sobrescrita pelo
  // default global do backend nas próximas montagens/recargas.
  localStorage.setItem(LANGUAGE_USER_SET_KEY, "1");
  document.documentElement.lang = safeLanguage;
  // Registra o histórico apenas em aplicações REAIS (não em reversões
  // de cancelamento) e quando o idioma realmente mudou — evita poluir
  // o status com "trocou de PT-BR para PT-BR".
  if (!options?.isRevert && previousLanguage !== safeLanguage) {
    recordLanguageHistory(previousLanguage, safeLanguage);
  }
  window.dispatchEvent(new CustomEvent("ccj-language-changed", { detail: safeLanguage }));

  // Abre/renova a janela de "switching" e agenda o flush da fila ao fim.
  if (switchingTimeoutId !== null) window.clearTimeout(switchingTimeoutId);
  switchingTimeoutId = window.setTimeout(() => {
    switchingTimeoutId = null;
    // Ao final da janela, aplica a última seleção pendente (se houver
    // e ainda diferir do idioma atualmente persistido).
    const queued = pendingQueuedLanguage;
    pendingQueuedLanguage = null;
    if (queued && queued !== getLanguage()) {
      applyLanguageNow(queued);
    } else {
      // Janela encerrada sem fila — fixa este idioma como "estável".
      preSwitchLanguage = null;
    }
  }, LANGUAGE_SWITCHING_WINDOW_MS);
}

export function setLanguage(language: AppLanguage) {
  const safeLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  // Se já estamos no meio de uma atualização, NÃO disparamos um novo
  // evento agora — apenas registramos a última seleção. O flush da
  // janela atual aplicará a mais recente. Isso evita uma cascata de
  // re-renderizações concorrentes quando o usuário troca rapidamente.
  if (typeof window !== "undefined" && isSwitchingActive()) {
    // Se a fila já bate com o estado atual, descartamos para não
    // disparar um evento redundante ao final da janela.
    pendingQueuedLanguage = safeLanguage === getLanguage() ? null : safeLanguage;
    return;
  }
  applyLanguageNow(safeLanguage);
}

/**
 * Cancela a troca de idioma em andamento. Comportamento:
 *  - Se há uma seleção enfileirada (ex.: usuário trocou várias vezes
 *    rapidamente), descarta-a — o flush não fará nada além de fechar
 *    a janela.
 *  - Se o idioma efetivo já foi alterado dentro da janela atual,
 *    reverte para o idioma "estável" capturado antes da troca.
 *  - Se não há nada para cancelar (fora da janela), é no-op.
 *
 * Retorna `true` se algo foi cancelado/revertido, `false` caso contrário —
 * útil para a UI decidir se mostra um toast/feedback de confirmação.
 */
export function cancelLanguageSwitch(): boolean {
  if (typeof window === "undefined") return false;
  if (!isSwitchingActive()) return false;

  const hadQueue = pendingQueuedLanguage !== null;
  pendingQueuedLanguage = null;

  const target = preSwitchLanguage;
  const current = getLanguage();
  // Fecha a janela atual ANTES de reverter — assim o re-apply não
  // pensa que está em uma sequência aninhada e captura o snapshot certo.
  if (switchingTimeoutId !== null) {
    window.clearTimeout(switchingTimeoutId);
    switchingTimeoutId = null;
  }
  preSwitchLanguage = null;

  if (target && target !== current) {
    // Reverte usando o caminho normal (dispara evento) para que TODAS
    // as telas reativas voltem ao idioma anterior coerentemente.
    applyLanguageNow(target, { isRevert: true });
    // O re-apply abriu uma nova janela; fechamos imediatamente porque
    // é uma reversão para o estado anterior — não queremos travar a UI
    // por mais 700ms num "switching" que o usuário acabou de cancelar.
    if (switchingTimeoutId !== null) {
      window.clearTimeout(switchingTimeoutId);
      switchingTimeoutId = null;
    }
    preSwitchLanguage = null;
    return true;
  }

  return hadQueue;
}

/**
 * Exposto para testes: limpa o estado interno da fila/janela. Em uso
 * normal o timeout natural cuida disso. Não chamar em código de produção.
 */
export function __resetLanguageSwitchingForTests() {
  if (switchingTimeoutId !== null && typeof window !== "undefined") {
    window.clearTimeout(switchingTimeoutId);
  }
  switchingTimeoutId = null;
  pendingQueuedLanguage = null;
  preSwitchLanguage = null;
}

/**
 * Hook compartilhado que expõe um booleano global indicando que uma
 * troca de idioma está em andamento. É TRUE por uma janela curta após
 * cada `ccj-language-changed`, permitindo que telas de leitura
 * (detalhe da história, página de colorir) desabilitem temporariamente
 * os botões de navegação/ações para evitar uma navegação iniciada
 * com texto em um idioma e completada em outro.
 */
export function useLanguageSwitching(): boolean {
  const [switching, setSwitching] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let timeoutId: number | null = null;
    const handle = () => {
      setSwitching(true);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setSwitching(false);
        timeoutId = null;
      }, LANGUAGE_SWITCHING_WINDOW_MS);
    };
    window.addEventListener("ccj-language-changed", handle);
    return () => {
      window.removeEventListener("ccj-language-changed", handle);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, []);
  return switching;
}

/**
 * Hook reativo que devolve o histórico persistido da última troca de
 * idioma. Atualiza automaticamente após cada `ccj-language-changed`
 * (e também via `storage` para refletir mudanças vindas de outras abas).
 */
export function useLanguageHistory(): LanguageHistoryEntry | null {
  const [entry, setEntry] = useState<LanguageHistoryEntry | null>(() => getLanguageHistory());
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setEntry(getLanguageHistory());
    window.addEventListener("ccj-language-changed", sync);
    window.addEventListener("storage", sync);
    // Garante leitura pós-hidratação (SSR pode ter retornado null).
    sync();
    return () => {
      window.removeEventListener("ccj-language-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return entry;
}

export function localizeStory(story: Story, language: AppLanguage): Story {
  const chain = buildLanguageFallbackChain(language);
  for (const lang of chain) {
    const translation = storyCopy[lang]?.[story.slug];
    if (translation && Object.keys(translation).length > 0) {
      return { ...story, ...translation };
    }
  }
  return story;
}

export function localizeCategory(category: Category, language: AppLanguage): Category {
  const chain = buildLanguageFallbackChain(language);
  for (const lang of chain) {
    const translation = categoryCopy[lang]?.[category.slug];
    if (translation && Object.keys(translation).length > 0) {
      return { ...category, ...translation };
    }
  }
  return category;
}

const backendStatusCopy: Record<AppLanguage, Record<string, string>> = {
  "pt-BR": {
    active: "Ativa",
    pending: "Pendente",
    paid: "Paga",
    approved: "Aprovada",
    completed: "Concluída",
    canceled: "Cancelada",
    cancelled: "Cancelada",
    refunded: "Reembolsada",
    rejected: "Rejeitada",
    expired: "Expirada",
    blocked: "Bloqueada",
    inactive: "Inativa",
    trialing: "Em teste",
    past_due: "Em atraso",
    no_data: "sem dados",
  },
  "en-US": {
    active: "Active",
    pending: "Pending",
    paid: "Paid",
    approved: "Approved",
    completed: "Completed",
    canceled: "Canceled",
    cancelled: "Canceled",
    refunded: "Refunded",
    rejected: "Rejected",
    expired: "Expired",
    blocked: "Blocked",
    inactive: "Inactive",
    trialing: "Trialing",
    past_due: "Past due",
    no_data: "no data",
  },
  "es-ES": {
    active: "Activa",
    pending: "Pendiente",
    paid: "Pagada",
    approved: "Aprobada",
    completed: "Completada",
    canceled: "Cancelada",
    cancelled: "Cancelada",
    refunded: "Reembolsada",
    rejected: "Rechazada",
    expired: "Expirada",
    blocked: "Bloqueada",
    inactive: "Inactiva",
    trialing: "En prueba",
    past_due: "En atraso",
    no_data: "sin datos",
  },
};

const backendPeriodCopy: Record<AppLanguage, Record<string, string>> = {
  "pt-BR": {
    today: "Hoje",
    "7d": "Últimos 7 dias",
    "30d": "Últimos 30 dias",
    "90d": "Últimos 90 dias",
    month: "Mês atual",
  },
  "en-US": {
    today: "Today",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    month: "Current month",
  },
  "es-ES": {
    today: "Hoy",
    "7d": "Últimos 7 días",
    "30d": "Últimos 30 días",
    "90d": "Últimos 90 días",
    month: "Mes actual",
  },
};

export function localizeBackendStatus(language: AppLanguage, status?: string | null) {
  const normalized = String(status ?? "no_data")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return (
    backendStatusCopy[language]?.[normalized] ??
    backendStatusCopy["pt-BR"][normalized] ??
    status ??
    backendStatusCopy[language].no_data
  );
}

export function localizeBackendPeriod(
  language: AppLanguage,
  period?: string | null,
  fallback?: string,
) {
  const normalized = String(period ?? "").trim();
  return (
    backendPeriodCopy[language]?.[normalized] ?? fallback ?? backendPeriodCopy[language]["30d"]
  );
}

export function translate(
  language: AppLanguage,
  key: CopyKey,
  vars?: Record<string, string | number>,
) {
  const chain = buildLanguageFallbackChain(language);
  let value: string | undefined;
  for (const lang of chain) {
    const fromOverride = languageOverrides[lang]?.[key];
    const fromCopy = (
      copy[lang as keyof typeof copy] as Partial<(typeof copy)["pt-BR"]> | undefined
    )?.[key as keyof (typeof copy)["pt-BR"]];
    const fromAdmin = (
      adminCopy[lang as keyof typeof adminCopy] as Partial<(typeof adminCopy)["pt-BR"]> | undefined
    )?.[key as keyof (typeof adminCopy)["pt-BR"]];
    const candidate = fromOverride ?? fromCopy ?? fromAdmin;
    if (typeof candidate === "string" && candidate.length > 0) {
      value = candidate as string;
      break;
    }
  }
  // Último recurso: a própria chave, para não devolver `undefined` na UI.
  const text = value ?? String(key);
  return Object.entries(vars ?? {}).reduce(
    (acc, [name, val]) => acc.replace(`{${name}}`, String(val)),
    text,
  );
}

// Singleton: garante que o fetch do idioma padrão do backend rode UMA
// única vez por sessão, mesmo com dezenas de componentes consumindo
// `useI18n` (cards, header, hero, rows...). Antes, cada componente
// disparava sua própria query — o resultado era 6+ chamadas idênticas
// a `app_settings` no carregamento da home, atrasando o FCP.
let backendLanguageFetchStarted = false;
function ensureBackendLanguageFetched() {
  if (backendLanguageFetchStarted || typeof window === "undefined") return;
  backendLanguageFetchStarted = true;
  const userAlreadyChose = localStorage.getItem(LANGUAGE_USER_SET_KEY) === "1";
  if (userAlreadyChose) return;
  supabase
    .from("app_settings")
    .select("default_language")
    .limit(1)
    .maybeSingle()
    .then(({ data }) => {
      const backendLanguage = data?.default_language as AppLanguage | undefined;
      if (
        backendLanguage &&
        SUPPORTED_LANGUAGES.includes(backendLanguage) &&
        backendLanguage !== getLanguage()
      ) {
        localStorage.setItem(LANGUAGE_KEY, backendLanguage);
        document.documentElement.lang = backendLanguage;
        window.dispatchEvent(new CustomEvent("ccj-language-changed", { detail: backendLanguage }));
      }
    });
}

export function useI18n() {
  const [language, setCurrent] = useState<AppLanguage>(getLanguage);
  useEffect(() => {
    const sync = () => setCurrent(getLanguage());
    // Após hidratar no cliente, lê o idioma persistido no `localStorage`.
    // Se divergir do estado inicial (que pode ter vindo do SSR como
    // `pt-BR`), dispara `ccj-language-changed` para que TODOS os
    // componentes reativos (incluindo o badge "Atualizando histórias…"
    // do perfil) mostrem o feedback coerente em vez de um flicker silencioso.
    const persisted = getLanguage();
    if (persisted !== language) {
      document.documentElement.lang = persisted;
      window.dispatchEvent(new CustomEvent("ccj-language-changed", { detail: persisted }));
      setCurrent(persisted);
    } else {
      // Mantém o atributo `lang` do <html> sincronizado mesmo quando
      // não há divergência — útil para acessibilidade e SEO.
      document.documentElement.lang = persisted;
    }
    // Fetch do idioma padrão do backend é deduplicado em escopo de módulo
    // (acima). Cada consumidor só liga os listeners locais.
    ensureBackendLanguageFetched();
    window.addEventListener("ccj-language-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ccj-language-changed", sync);
      window.removeEventListener("storage", sync);
    };
    // Roda só na montagem; intencionalmente sem `language` nas deps para
    // não re-disparar o evento a cada troca subsequente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return {
    language,
    t: (key: CopyKey, vars?: Record<string, string | number>) => translate(language, key, vars),
    localizeStory: (story: Story) => localizeStory(story, language),
    localizeCategory: (category: Category) => localizeCategory(category, language),
  };
}
