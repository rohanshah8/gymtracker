'use client';

/**
 * ShareCard.tsx
 * ----------------------------------------------------------------
 * The "growth engine" component described in Section 3 of the
 * GymTracker system design. Renders a clean, brandable image of a
 * workout summary or a fresh PR, then shares it via the native
 * Web Share API (falls back to download on unsupported browsers).
 *
 * Install:
 *   npm install html-to-image
 *
 * Usage:
 *   <ShareCard
 *     mode="pr"
 *     exerciseName="Bench Press"
 *     weight={100}
 *     unit="kg"
 *     reps={5}
 *     estimated1RM={115}
 *     previousBest={95}
 *     history={[{ date: '2026-05-01', weight: 60 }, ... ]}
 *   />
 * ----------------------------------------------------------------
 */

import { useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';

// ---------- Types ----------

type HistoryPoint = { date: string; weight: number };

type PRCardProps = {
  mode: 'pr';
  exerciseName: string;
  weight: number;
  unit: 'kg' | 'lb';
  reps: number;
  estimated1RM: number;
  previousBest?: number;
  history?: HistoryPoint[];
};

type WorkoutCardProps = {
  mode: 'workout';
  workoutTitle: string;
  date: string;
  durationMinutes: number;
  totalVolume: number;
  unit: 'kg' | 'lb';
  exerciseCount: number;
  setCount: number;
  prsHitCount?: number;
};

type ShareCardProps = (PRCardProps | WorkoutCardProps) & {
  /** Called after a successful share or download, e.g. to close a modal */
  onShared?: () => void;
  /** App name shown as a small watermark — keep it subtle, this IS your marketing channel */
  appName?: string;
};

// ---------- Tiny inline sparkline (no chart library needed for the card itself) ----------

function MiniSparkline({ points }: { points: HistoryPoint[] }) {
  if (!points || points.length < 2) return null;

  const width = 280;
  const height = 70;
  const weights = points.map((p) => p.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p.weight - min) / range) * height;
    return `${x},${y}`;
  });

  const lastX = width;
  // Guarded by the length check above — there's always a last point here.
  const lastY = height - ((weights[weights.length - 1]! - min) / range) * height;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke="#f97316"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* highlight dot on the latest (newest) point */}
      <circle cx={lastX} cy={lastY} r={6} fill="#f97316" />
      <circle cx={lastX} cy={lastY} r={10} fill="#f97316" opacity={0.25} />
    </svg>
  );
}

// ---------- The visual card that gets rasterized into a PNG ----------

function CardVisual(props: ShareCardProps) {
  const appName = props.appName ?? 'GymTracker';

  if (props.mode === 'pr') {
    const gain =
      props.previousBest !== undefined ? props.weight - props.previousBest : null;

    return (
      <div
        className="w-[360px] rounded-3xl bg-neutral-900 p-8 text-white flex flex-col gap-6"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        <div className="flex items-center gap-2 text-orange-500 font-bold text-sm tracking-wide">
          <span className="text-2xl">🏆</span>
          <span>NEW PERSONAL RECORD</span>
        </div>

        <div>
          <div className="text-xl font-semibold text-neutral-300">{props.exerciseName}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-6xl font-extrabold text-orange-500 leading-none">
              {props.weight}
            </span>
            <span className="text-2xl font-bold text-neutral-300">{props.unit}</span>
            <span className="text-3xl font-bold text-neutral-500">×</span>
            <span className="text-4xl font-extrabold text-white">{props.reps}</span>
            <span className="text-xl font-semibold text-neutral-400">reps</span>
          </div>
        </div>

        <div className="rounded-2xl bg-neutral-800 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-400">Est. 1RM</div>
            <div className="text-2xl font-bold text-white">
              {Math.round(props.estimated1RM)} {props.unit}
            </div>
          </div>
          {gain !== null && gain > 0 && (
            <div className="text-orange-500 font-bold text-lg">
              ↑ {gain} {props.unit}
            </div>
          )}
        </div>

        {props.history && props.history.length > 1 && (
          <div>
            <MiniSparkline points={props.history} />
            <div className="text-xs uppercase tracking-wide text-neutral-500 mt-1">
              PR progress
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
          <span className="text-xs text-neutral-500">#KeepPushing</span>
          <span className="text-xs font-bold text-neutral-400">{appName}</span>
        </div>
      </div>
    );
  }

  // mode === 'workout'
  return (
    <div
      className="w-[360px] rounded-3xl bg-neutral-900 p-8 text-white flex flex-col gap-6"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      <div className="text-orange-500 font-bold text-sm tracking-wide">
        WORKOUT COMPLETE
      </div>

      <div>
        <div className="text-2xl font-bold">{props.workoutTitle}</div>
        <div className="text-sm text-neutral-400">{props.date}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Duration" value={`${props.durationMinutes} min`} />
        <Stat label="Total Volume" value={`${props.totalVolume.toLocaleString()} ${props.unit}`} />
        <Stat label="Exercises" value={String(props.exerciseCount)} />
        <Stat label="Sets" value={String(props.setCount)} />
      </div>

      {props.prsHitCount ? (
        <div className="rounded-2xl bg-orange-500/10 border border-orange-500/40 px-5 py-3 text-orange-400 font-bold text-center">
          🏆 {props.prsHitCount} New PR{props.prsHitCount > 1 ? 's' : ''} today
        </div>
      ) : null}

      <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
        <span className="text-xs text-neutral-500">#KeepPushing</span>
        <span className="text-xs font-bold text-neutral-400">{appName}</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-neutral-800 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-neutral-400">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}

// ---------- Public component: preview + share/download button ----------

export default function ShareCard(props: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'generating' | 'error'>('idle');

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    setStatus('generating');

    try {
      // Rasterize the DOM node to a PNG data URL, 3x pixel density for crisp
      // sharing on retina phone screens and Instagram Stories.
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
      });

      const blob = await (await fetch(dataUrl)).blob();
      const fileName =
        props.mode === 'pr'
          ? `${props.exerciseName.replace(/\s+/g, '-').toLowerCase()}-pr.png`
          : `${props.workoutTitle.replace(/\s+/g, '-').toLowerCase()}-workout.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      // Prefer the native share sheet (WhatsApp / Instagram / iMessage etc.)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title:
            props.mode === 'pr'
              ? `New PR on ${props.exerciseName}!`
              : `${props.workoutTitle} complete!`,
        });
      } else {
        // Fallback for desktop / unsupported browsers: trigger a download
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        link.click();
      }

      setStatus('idle');
      props.onShared?.();
    } catch (err) {
      // AbortError fires if the user just cancels the native share sheet —
      // that's a normal, silent case, not an actual error to surface.
      if ((err as DOMException)?.name !== 'AbortError') {
        console.error('ShareCard failed to generate/share image:', err);
        setStatus('error');
      } else {
        setStatus('idle');
      }
    }
  }, [props]);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* The node passed to toPng must be visible (not display:none) to rasterize correctly */}
      <div ref={cardRef}>
        <CardVisual {...props} />
      </div>

      <button
        onClick={handleShare}
        disabled={status === 'generating'}
        className="w-full max-w-[360px] rounded-2xl bg-orange-500 py-4 text-lg font-bold text-white
                   active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {status === 'generating' ? 'Preparing image…' : 'Share'}
      </button>

      {status === 'error' && (
        <p className="text-sm text-red-500">
          Couldn’t share right now — try again, or long-press the card to save it manually.
        </p>
      )}
    </div>
  );
}
