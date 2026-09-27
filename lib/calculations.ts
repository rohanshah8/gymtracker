/**
 * Pure calculation helpers — no I/O, no React/Supabase imports, so these
 * are trivial to unit test and safe to call from both client and server.
 */
import type { WeightUnit } from './database.types';

// ---------- 1RM ----------

/**
 * Epley formula: 1RM = weight * (1 + reps/30).
 * Matches the trigger in supabase/migrations/0001_init.sql — keep both
 * in sync if this ever changes, since the DB is the source of truth for
 * stored personal_records.estimated_1rm.
 */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// ---------- Volume ----------

export interface VolumeSet {
  weight: number | null;
  reps: number | null;
  is_warmup: boolean;
}

/**
 * Total volume = sum(weight * reps) across resistance sets. Warm-up sets
 * are excluded by default — they don't count toward training volume,
 * matching FitNotes' convention.
 */
export function calculateVolume(
  sets: VolumeSet[],
  { includeWarmups = false }: { includeWarmups?: boolean } = {}
): number {
  return sets.reduce((total, set) => {
    if (!includeWarmups && set.is_warmup) return total;
    if (set.weight == null || set.reps == null) return total;
    return total + set.weight * set.reps;
  }, 0);
}

// ---------- Streak ----------

/**
 * Current streak in days: consecutive calendar days with at least one
 * workout, walking backward from the most recent workout date. The
 * streak is only "alive" if the most recent workout was today or
 * yesterday — otherwise it's considered broken and this returns 0.
 */
export function calculateStreak(workoutDatesISO: string[], today: Date = new Date()): number {
  if (workoutDatesISO.length === 0) return 0;

  const uniqueDays = Array.from(new Set(workoutDatesISO.map((d) => d.slice(0, 10)))).sort((a, b) =>
    a < b ? 1 : -1
  ); // descending, newest first

  const todayStr = toDateOnlyString(today);
  const yesterdayStr = toDateOnlyString(addDays(today, -1));

  if (uniqueDays[0] !== todayStr && uniqueDays[0] !== yesterdayStr) {
    return 0;
  }

  let streak = 1;
  let cursor = parseLocalDate(uniqueDays[0]);

  for (let i = 1; i < uniqueDays.length; i++) {
    const expected = toDateOnlyString(addDays(cursor, -1));
    if (uniqueDays[i] === expected) {
      streak += 1;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }

  return streak;
}

// Deliberately NOT using toISOString() here: that converts through UTC,
// which shifts the calendar day for anyone not near UTC (e.g. a workout
// logged at 11pm local time could register as "tomorrow" or vice versa).
// These build the date string from local Y/M/D components instead.
function toDateOnlyString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Parses a 'YYYY-MM-DD' string as a local-midnight Date (no UTC shift). */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ---------- Plate calculator ----------

const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
const DEFAULT_PLATES_LB = [45, 35, 25, 10, 5, 2.5];

export interface PlateBreakdown {
  /** Weight needed on ONE side of the bar, after removing the bar's own weight. */
  perSide: number;
  /** Greedy plate list for one side, largest first. Load both sides identically. */
  plates: number[];
  /** False if perSide couldn't be matched exactly with the available plates. */
  exact: boolean;
  /** Leftover per-side weight that couldn't be matched (0 when exact). */
  remainder: number;
}

/** Input target weight + bar weight, output plates needed per side. */
export function calculatePlates(
  targetWeight: number,
  barWeight: number,
  unit: WeightUnit,
  availablePlates?: number[]
): PlateBreakdown {
  const plates = availablePlates ?? (unit === 'kg' ? DEFAULT_PLATES_KG : DEFAULT_PLATES_LB);
  const perSide = Math.max(0, (targetWeight - barWeight) / 2);

  let remainder = perSide;
  const used: number[] = [];

  for (const plate of [...plates].sort((a, b) => b - a)) {
    while (remainder + 1e-6 >= plate) {
      used.push(plate);
      remainder = Math.round((remainder - plate) * 100) / 100;
    }
  }

  return { perSide, plates: used, exact: remainder < 0.01, remainder };
}
