'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Auto-starts a countdown whenever `trigger` changes (bump a counter each
 * time a non-warm-up set is logged). Sound + vibration fire on
 * completion; +30s and Skip are one tap each, per the design.
 */
export default function RestTimer({
  trigger,
  seconds = 90,
  onComplete,
}: {
  /** Increment this number to (re)start the timer. 0 means "not started yet". */
  trigger: number;
  seconds?: number;
  onComplete?: () => void;
}) {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastTriggerRef = useRef(0);

  useEffect(() => {
    if (trigger === 0 || trigger === lastTriggerRef.current) return;
    lastTriggerRef.current = trigger;
    setRemaining(seconds);
    setRunning(true);
  }, [trigger, seconds]);

  useEffect(() => {
    if (!running) return;

    if (remaining <= 0) {
      setRunning(false);
      playChime();
      vibrate();
      onComplete?.();
      return;
    }

    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, remaining]);

  function playChime() {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = audioCtxRef.current ?? new AudioCtx();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Autoplay can be blocked before any user gesture — vibration still
      // fires below, so the rest cue isn't entirely silent.
    }
  }

  function vibrate() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  }

  if (!running) return null;

  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="mx-4 mb-2 flex items-center justify-between rounded-2xl bg-brand px-5 py-3 text-white shadow-lg">
      <span className="text-lg font-bold tabular-nums">
        {minutes}:{secs.toString().padStart(2, '0')}
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => setRemaining((r) => r + 30)}
          className="rounded-lg bg-black/20 px-3 py-1 text-sm font-semibold"
        >
          +30s
        </button>
        <button
          onClick={() => setRunning(false)}
          className="rounded-lg bg-black/20 px-3 py-1 text-sm font-semibold"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
