import { useCallback, useRef } from "react";

/**
 * Tiny tactile/audio feedback helper for satisfying "punch" moments.
 * Fully optional and silently no-ops where unsupported — never blocks
 * or throws, safe to call from any click handler.
 */
export function useFeedback() {
  const ctxRef = useRef(null);

  const getCtx = useCallback(() => {
    try {
      if (!ctxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        ctxRef.current = new AudioCtx();
      }
      if (ctxRef.current.state === "suspended") ctxRef.current.resume();
      return ctxRef.current;
    } catch {
      return null;
    }
  }, []);

  const chime = useCallback(
    (variant = "in") => {
      const ctx = getCtx();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;
        const notes = variant === "out" ? [660, 523] : [523, 784];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          const start = now + i * 0.09;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.09, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
          osc.connect(gain).connect(ctx.destination);
          osc.start(start);
          osc.stop(start + 0.3);
        });
      } catch {
        // no-op — audio is a nice-to-have, never critical
      }
    },
    [getCtx]
  );

  const vibrate = useCallback((pattern = [12]) => {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch {
      // no-op
    }
  }, []);

  const celebrate = useCallback(
    (variant = "in") => {
      vibrate(variant === "out" ? [10, 40, 10, 40, 18] : [10, 40, 18]);
      chime(variant);
    },
    [vibrate, chime]
  );

  return { chime, vibrate, celebrate };
}
