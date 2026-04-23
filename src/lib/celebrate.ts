import confetti from "canvas-confetti";

/** Disparo curto e festivo para a criança quando algo dá certo. */
export function celebrate() {
  const colors = ["#FF9E8A", "#F2C96B", "#7CB7FF", "#A7D89A", "#C5A3FF"];
  const end = Date.now() + 1200;

  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.7 },
      colors,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.7 },
      colors,
      disableForReducedMotion: true,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };

  // burst central
  confetti({
    particleCount: 80,
    spread: 100,
    startVelocity: 45,
    origin: { x: 0.5, y: 0.5 },
    colors,
    disableForReducedMotion: true,
  });
  frame();
}

/**
 * Versão sutil e breve do confete — para conclusão de página.
 * - Apenas dois pequenos bursts laterais (~600ms total)
 * - Partículas leves, sem cobrir a tela
 * - Respeita prefers-reduced-motion (não dispara nada)
 * - pointer-events do canvas é "none" por padrão, então não bloqueia toque
 */
export function celebrateSubtle() {
  if (typeof window !== "undefined") {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
  }

  const colors = ["#FF9E8A", "#F2C96B", "#A7D89A", "#7CB7FF"];

  confetti({
    particleCount: 18,
    angle: 60,
    spread: 55,
    startVelocity: 30,
    gravity: 0.9,
    ticks: 90,
    scalar: 0.8,
    origin: { x: 0.05, y: 0.85 },
    colors,
    disableForReducedMotion: true,
  });
  confetti({
    particleCount: 18,
    angle: 120,
    spread: 55,
    startVelocity: 30,
    gravity: 0.9,
    ticks: 90,
    scalar: 0.8,
    origin: { x: 0.95, y: 0.85 },
    colors,
    disableForReducedMotion: true,
  });
}
