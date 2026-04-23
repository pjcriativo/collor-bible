/**
 * TESTE de novo estilo "fofo inspirado em Pixar" — desenhado à mão como SVG.
 *
 * Compatível com o motor atual de colorir:
 * - viewBox 0 0 600 600 (igual ao restante)
 * - Cada região pintável é um <path>/<ellipse>/<circle> com `id="fill-..."`
 * - Traço grosso #2a2018, fundo creme #fdf6e8
 *
 * Cena de teste: Casal de leões (macho + fêmea, lado a lado, sorrindo).
 */

export const lionCouplePixarTest: string = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  <!-- Fundo creme -->
  <rect id="fill-bg" x="0" y="0" width="600" height="600" fill="#fdf6e8" stroke="none"/>

  <!-- Chão / colina suave -->
  <path id="fill-ground" d="M0,470 C150,430 280,455 420,440 C500,432 560,445 600,438 L600,600 L0,600 Z"
        fill="#ffffff" stroke="#2a2018" stroke-width="5" stroke-linejoin="round"/>

  <!-- Sol/lua atrás -->
  <circle id="fill-sun" cx="500" cy="120" r="55" fill="#ffffff" stroke="#2a2018" stroke-width="5"/>

  <!-- Nuvem decorativa esquerda -->
  <path id="fill-cloud-1" d="M70,130 q-30,0 -30,28 q0,28 30,28 h90 q30,0 30,-28 q0,-28 -30,-28 q-6,-22 -32,-22 q-26,0 -32,22 z"
        fill="#ffffff" stroke="#2a2018" stroke-width="5" stroke-linejoin="round"/>

  <!-- ============== LEÃO MACHO (esquerda) ============== -->
  <!-- Corpo -->
  <ellipse id="fill-male-body" cx="200" cy="430" rx="95" ry="70"
           fill="#ffffff" stroke="#2a2018" stroke-width="6"/>

  <!-- Patas dianteiras -->
  <path id="fill-male-leg-l" d="M150,475 q-8,40 0,75 q14,8 28,0 q4,-30 0,-65 z"
        fill="#ffffff" stroke="#2a2018" stroke-width="6" stroke-linejoin="round"/>
  <path id="fill-male-leg-r" d="M225,478 q-6,38 0,72 q14,8 28,0 q4,-28 0,-62 z"
        fill="#ffffff" stroke="#2a2018" stroke-width="6" stroke-linejoin="round"/>

  <!-- Rabo -->
  <path id="fill-male-tail" d="M285,420 q40,-10 55,15 q12,22 -10,32"
        fill="none" stroke="#2a2018" stroke-width="6" stroke-linecap="round"/>
  <ellipse id="fill-male-tail-tip" cx="335" cy="465" rx="14" ry="16"
           fill="#ffffff" stroke="#2a2018" stroke-width="6"/>

  <!-- Juba (grande, atrás da cabeça) -->
  <path id="fill-male-mane" d="
    M200,290
    q-55,-8 -78,28
    q-22,40 8,72
    q-26,30 8,62
    q26,24 60,18
    q22,28 60,18
    q40,-8 50,-40
    q34,-16 28,-58
    q26,-32 0,-66
    q-22,-38 -76,-34
    q-22,-22 -60,0 z"
    fill="#ffffff" stroke="#2a2018" stroke-width="6" stroke-linejoin="round"/>

  <!-- Cabeça -->
  <ellipse id="fill-male-head" cx="200" cy="340" rx="68" ry="64"
           fill="#ffffff" stroke="#2a2018" stroke-width="6"/>

  <!-- Orelhas -->
  <ellipse id="fill-male-ear-l" cx="155" cy="298" rx="14" ry="12"
           fill="#ffffff" stroke="#2a2018" stroke-width="5"/>
  <ellipse id="fill-male-ear-r" cx="245" cy="298" rx="14" ry="12"
           fill="#ffffff" stroke="#2a2018" stroke-width="5"/>

  <!-- Focinho -->
  <ellipse id="fill-male-muzzle" cx="200" cy="365" rx="32" ry="24"
           fill="#ffffff" stroke="#2a2018" stroke-width="5"/>

  <!-- Nariz (não pintável, decoração) -->
  <path d="M188,350 q12,-10 24,0 q-4,10 -12,12 q-8,-2 -12,-12 z" fill="#2a2018"/>
  <!-- Boca sorriso -->
  <path d="M200,366 v8 M200,374 q-8,8 -16,4 M200,374 q8,8 16,4" fill="none" stroke="#2a2018" stroke-width="4" stroke-linecap="round"/>

  <!-- Olhos (brancos pintáveis) -->
  <ellipse id="fill-male-eye-l" cx="178" cy="332" rx="9" ry="11"
           fill="#ffffff" stroke="#2a2018" stroke-width="4"/>
  <ellipse id="fill-male-eye-r" cx="222" cy="332" rx="9" ry="11"
           fill="#ffffff" stroke="#2a2018" stroke-width="4"/>
  <!-- Pupilas -->
  <circle cx="180" cy="334" r="4" fill="#2a2018"/>
  <circle cx="224" cy="334" r="4" fill="#2a2018"/>
  <circle cx="181" cy="332" r="1.5" fill="#ffffff"/>
  <circle cx="225" cy="332" r="1.5" fill="#ffffff"/>

  <!-- ============== LEOA (direita) ============== -->
  <!-- Corpo -->
  <ellipse id="fill-female-body" cx="430" cy="440" rx="85" ry="62"
           fill="#ffffff" stroke="#2a2018" stroke-width="6"/>

  <!-- Patas dianteiras -->
  <path id="fill-female-leg-l" d="M388,485 q-6,35 0,65 q12,7 24,0 q4,-26 0,-56 z"
        fill="#ffffff" stroke="#2a2018" stroke-width="6" stroke-linejoin="round"/>
  <path id="fill-female-leg-r" d="M452,488 q-6,33 0,62 q12,7 24,0 q4,-24 0,-54 z"
        fill="#ffffff" stroke="#2a2018" stroke-width="6" stroke-linejoin="round"/>

  <!-- Rabo -->
  <path id="fill-female-tail" d="M515,430 q40,-6 50,18 q8,20 -14,28"
        fill="none" stroke="#2a2018" stroke-width="6" stroke-linecap="round"/>
  <ellipse id="fill-female-tail-tip" cx="558" cy="478" rx="13" ry="15"
           fill="#ffffff" stroke="#2a2018" stroke-width="6"/>

  <!-- Cabeça (sem juba, mais arredondada) -->
  <ellipse id="fill-female-head" cx="430" cy="345" rx="58" ry="58"
           fill="#ffffff" stroke="#2a2018" stroke-width="6"/>

  <!-- Orelhas (maiores, sem juba escondendo) -->
  <ellipse id="fill-female-ear-l" cx="388" cy="302" rx="16" ry="18"
           fill="#ffffff" stroke="#2a2018" stroke-width="5"/>
  <ellipse id="fill-female-ear-r" cx="472" cy="302" rx="16" ry="18"
           fill="#ffffff" stroke="#2a2018" stroke-width="5"/>
  <!-- Interior das orelhas (decoração) -->
  <ellipse cx="388" cy="305" rx="7" ry="9" fill="none" stroke="#2a2018" stroke-width="3"/>
  <ellipse cx="472" cy="305" rx="7" ry="9" fill="none" stroke="#2a2018" stroke-width="3"/>

  <!-- Tufo na cabeça -->
  <path d="M425,290 q5,-12 10,0" fill="none" stroke="#2a2018" stroke-width="4" stroke-linecap="round"/>

  <!-- Focinho -->
  <ellipse id="fill-female-muzzle" cx="430" cy="368" rx="28" ry="22"
           fill="#ffffff" stroke="#2a2018" stroke-width="5"/>

  <!-- Nariz e boca -->
  <path d="M420,355 q10,-9 20,0 q-3,9 -10,11 q-7,-2 -10,-11 z" fill="#2a2018"/>
  <path d="M430,371 v8 M430,379 q-7,7 -14,3 M430,379 q7,7 14,3" fill="none" stroke="#2a2018" stroke-width="4" stroke-linecap="round"/>

  <!-- Olhos com cílios (mais "feminino") -->
  <ellipse id="fill-female-eye-l" cx="412" cy="338" rx="8" ry="10"
           fill="#ffffff" stroke="#2a2018" stroke-width="4"/>
  <ellipse id="fill-female-eye-r" cx="448" cy="338" rx="8" ry="10"
           fill="#ffffff" stroke="#2a2018" stroke-width="4"/>
  <circle cx="414" cy="340" r="3.5" fill="#2a2018"/>
  <circle cx="450" cy="340" r="3.5" fill="#2a2018"/>
  <circle cx="415" cy="338" r="1.3" fill="#ffffff"/>
  <circle cx="451" cy="338" r="1.3" fill="#ffffff"/>
  <!-- Cílios -->
  <path d="M404,330 l-4,-4 M408,326 l-2,-5 M452,326 l2,-5 M456,330 l4,-4"
        fill="none" stroke="#2a2018" stroke-width="3" stroke-linecap="round"/>

  <!-- Coraçãozinho entre eles -->
  <path id="fill-heart" d="M315,235 q-12,-18 -24,-6 q-12,12 0,24 l24,22 l24,-22 q12,-12 0,-24 q-12,-12 -24,6 z"
        fill="#ffffff" stroke="#2a2018" stroke-width="5" stroke-linejoin="round"/>

  <!-- Grama (decoração) -->
  <path d="M40,475 q4,-12 8,0 M70,470 q4,-14 8,0 M530,470 q4,-12 8,0 M560,475 q4,-12 8,0"
        fill="none" stroke="#2a2018" stroke-width="4" stroke-linecap="round"/>
</svg>
`.trim();
