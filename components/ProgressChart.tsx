'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ProgressPoint } from '@/lib/queries';
import type { WeightUnit } from '@/lib/database.types';

/** Top weight + estimated 1RM over time for one exercise (System Design §6.1/§2.1.8). */
export default function ProgressChart({ data, unit }: { data: ProgressPoint[]; unit: WeightUnit }) {
  if (data.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-card bg-surface-raised text-sm text-neutral-500">
        Log this exercise a couple more times to see a progress chart.
      </div>
    );
  }

  return (
    <div className="h-56 rounded-card bg-surface-raised p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <XAxis
            dataKey="date"
            tick={{ fill: '#a3a3a3', fontSize: 11 }}
            tickFormatter={(d: string) => d.slice(5)}
            axisLine={{ stroke: '#404040' }}
            tickLine={false}
          />
          <YAxis tick={{ fill: '#a3a3a3', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{ background: '#262626', border: '1px solid #404040', borderRadius: 12 }}
            labelStyle={{ color: '#e5e5e5' }}
            formatter={(value: number, name: string) => [`${value} ${unit}`, name]}
          />
          <Line
            type="monotone"
            dataKey="topWeight"
            name="Top weight"
            stroke="#f97316"
            strokeWidth={3}
            dot={{ r: 3, fill: '#f97316' }}
          />
          <Line
            type="monotone"
            dataKey="estimated1RM"
            name="Est. 1RM"
            stroke="#737373"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
