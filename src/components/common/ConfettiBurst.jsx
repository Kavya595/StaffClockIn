import { useMemo } from "react";

const COLORS = ["#FD6C00", "#120D9E", "#13A870", "#2E90E2", "#E29A2E", "#FFFFFF"];

/**
 * A short-lived burst of particles radiating from the center of its parent.
 * Parent must be `position: relative`. Mount with a fresh `seed` each time
 * to replay the animation (e.g. seed={burstCount}).
 */
export default function ConfettiBurst({ seed = 0, count = 26 }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const distance = 60 + Math.random() * 70;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance - 20;
      const rot = Math.round(Math.random() * 540 - 270);
      const dur = 0.7 + Math.random() * 0.5;
      const delay = Math.random() * 0.08;
      const size = 5 + Math.random() * 5;
      const isRound = i % 3 === 0;
      return {
        id: `${seed}-${i}`,
        style: {
          "--tx": `${tx}px`,
          "--ty": `${ty}px`,
          "--rot": `${rot}deg`,
          "--dur": `${dur}s`,
          animationDelay: `${delay}s`,
          background: COLORS[i % COLORS.length],
          width: size,
          height: isRound ? size : size * 1.8,
          borderRadius: isRound ? "9999px" : "2px",
        },
      };
    });
  }, [seed, count]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute left-1/2 top-1/2 animate-confetti"
          style={p.style}
        />
      ))}
    </div>
  );
}
