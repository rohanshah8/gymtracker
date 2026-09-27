import type { ExportRow } from './queries';

const HEADER = [
  'date',
  'workout',
  'exercise',
  'set',
  'weight',
  'reps',
  'distance',
  'duration_seconds',
  'warmup',
  'comment',
];

/** Full data portability, no lock-in — matches the design's "own your data" principle. */
export function exportRowsToCSV(rows: ExportRow[]): string {
  const lines = [HEADER.join(',')];

  for (const row of rows) {
    lines.push(
      [
        row.workout_date,
        csvEscape(row.workout_title),
        csvEscape(row.exercise_name),
        String(row.set_index),
        row.weight ?? '',
        row.reps ?? '',
        row.distance ?? '',
        row.duration_seconds ?? '',
        row.is_warmup ? 'yes' : 'no',
        csvEscape(row.comment ?? ''),
      ].join(',')
    );
  }

  return lines.join('\n');
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
