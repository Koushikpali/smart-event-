import confetti from 'canvas-confetti';

export function celebrate() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#3B34FF', '#FFB627', '#D9D5FF', '#12915A'];
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors });
  setTimeout(() => confetti({ particleCount: 70, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors }), 250);
  setTimeout(() => confetti({ particleCount: 70, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors }), 400);
}
