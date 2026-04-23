## Refação completa da história "Arca de Noé" — 30 templates premium 1:1

Substituir totalmente o gerador atual (`noahLayouts` em `src/lib/coloring-pages.ts`) por uma nova coleção de 30 cenas redesenhadas em SVG line art, seguindo o padrão visual da referência: composição cheia, elementos grandes, áreas de pintura amplas e mobile-first.

### O que muda na experiência

- Cada uma das 30 páginas vira uma cena nova, mais cheia e bonita.
- Personagens (Noé, família) e animais ficam grandes, expressivos e ocupam 70–85% do canvas quadrado.
- Áreas de pintura passam a ser maiores e em menor número por página (12–20 regiões médias/grandes em vez de muitas micro), o que reduz fricção no toque mobile.
- Fundo simples mas contextual (céu, colinas, água, nuvens, arco-íris) — sem competir com o assunto principal.
- Storyboard fiel aos 30 momentos do PRD (de "Deus fala com Noé" até "Final feliz").

### Estrutura técnica

Tudo continua 100% procedural em SVG dentro de `src/lib/coloring-pages.ts` — sem nova dependência, sem migration de banco, compatível com o engine de pintura atual (cada região tem `id="fill-..."`, autosave, magic paint, modal de conclusão e progresso continuam funcionando).

**1. Nova biblioteca de primitivas "premium" (mesmo arquivo, novas funções)**

Cada primitiva é desenhada maior, com traço `stroke-width="3.6"` e `stroke="#2A2622"` (line art mais escuro, mais legível em mobile, padrão da referência). Sem mudar o `viewBox 0 0 600 600` (já é 1:1).

- `noahPremium(id, cx, cy, scale, pose)` — Noé semi-realista com cabeça grande, olhos expressivos, barba estilizada, túnica e cinto. Poses: `idle`, `pray`, `point`, `carry`, `staff`, `hammer`. Áreas: cabeça, cabelo, barba, túnica, cinto, manto, mangas, sandálias.
- `arkPremium(id, cx, cy, scale, state)` — Arca grande e bonita com casco curvo, cabine, telhado de duas águas, porta dupla e janelas redondas. Estados: `building`, `closed`, `open`, `rest`. Áreas amplas: casco, cabine, telhado, porta, 2 janelas, rampa.
- `animalBig(id, cx, cy, kind, scale)` — Animais "fofos premium" reconhecíveis e grandes, com áreas internas mínimas: `lion`, `elephant`, `giraffe`, `sheep`, `zebra`, `horse`, `bear`, `monkey`, `parrot`, `hippo`. Cada um exporta 3–5 áreas grandes (corpo, cabeça, juba/orelhas/manchas, pernas).
- `dovePremium`, `rainbowPremium`, `cloudBig`, `mountainRange`, `waveBig`, `raindropBig`, `oliveBranch` — versões maiores e com áreas mais cheias das primitivas atuais.
- `familyGroup(id, cx, cy, scale)` — Noé + esposa + 3 filhos em silhuetas arredondadas, agrupados.

**2. Novo gerador `generateNoahPremiumPages(): string[]`**

Substitui `noahLayouts` e a função que era chamada para o slug `"noe-e-a-arca"`. Devolve exatamente 30 SVGs, um por cena do storyboard do PRD:

```text
01 Deus fala com Noé           06 Arca pronta              ...   25 Pomba volta com oliveira
02 Noé recebe a missão         07 Animais chegando         ...   26 Porta se abre
03 Noé planeja                 08 Noé recebe os animais    ...   27 Animais saem
04 Construção                  09 Pares a caminho          ...   28 Noé agradece
05 Arca tomando forma          10 Entrada na arca          ...   29 Arco-íris da promessa
                                                                   30 Final feliz
```

Cada cena é uma função dedicada (não um layout genérico parametrizado) para garantir composição cheia, hierarquia clara e quantidade controlada de regiões.

**3. Padrão visual aplicado a todas as 30 cenas**

- Canvas 600×600, moldura sutil, fundo branco.
- Assunto principal centralizado, ocupando ~70–85% da altura útil.
- Paleta de regiões: 12–20 áreas por página, todas com largura/altura mínima de ~40px (alvo de toque confortável).
- IDs únicos por página (`page-N-...`) para não colidir com o store de progresso.

**4. Integração**

- Trocar a entrada em `storyData["noe-e-a-arca"]` (linha ~1546) para usar `generateNoahPremiumPages()` no lugar de `generateNoeStoryPages()`.
- Manter `generateNoeStoryPages` removido (não é mais referenciado).
- Manter o slug, título, ordem, capa e categorias da história intactos — nada muda em rotas, favoritos, progresso salvo (o engine usa o slug + index da página, então o progresso antigo continua coexistindo, mas como as áreas mudaram de id, cada página será considerada "limpa" no novo desenho — comportamento esperado para uma refação).

### Arquivos afetados

- `src/lib/coloring-pages.ts` — único arquivo modificado. Adiciona ~600 linhas de novas primitivas + 30 cenas; remove `noahLayouts` e helpers exclusivos do antigo gerador Noé.

### Garantia de qualidade

- Os testes existentes que usam slug `"noe"` em storage (`src/lib/shown-toasts.test.ts` etc.) continuam passando — só dependem do slug, não dos SVGs.
- Os testes de progresso (`coloring-progress.real-svgs.test.ts`) usam SVGs próprios, sem acoplamento à implementação Noé.
- Após a refação, rodar `npm run typecheck` e a suíte de testes.
- QA manual sugerido: abrir `/colorir/noe-e-a-arca` no mobile preview, percorrer as 30 páginas e validar o checklist do PRD (composição cheia, áreas grandes, narrativa clara).

### Fora de escopo (proposto pelo PRD mas não incluído)

- "Fase 2" do PRD (prompt-base por página, guia técnico de camadas, modelo de aprovação em lote) — fica para depois.
- Substituição de outras histórias além de "Arca de Noé".
- Exportar PNG/PDF dos novos templates.
