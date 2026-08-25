'use client';

import { motion } from 'framer-motion';
import { useId } from 'react';
import type { SparkPoint } from '@/lib/platform-metrics';

type Props = {
  data: SparkPoint[];
  gradientFrom: string;
  gradientTo: string;
  height?: number;
};

export function SparkChart({ data, gradientFrom, gradientTo, height = 120 }: Props) {
  const uid = useId().replace(/:/g, '');
  const fillId = `spark-fill-${uid}`;
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No data yet</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  const w = 100 / Math.max(data.length - 1, 1);

  const points = data
    .map((d, i) => {
      const x = i * w;
      const y = height - (d.value / max) * (height - 8);
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,${height} ${points} ${(data.length - 1) * w},${height}`;

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <svg viewBox={`0 0 ${(data.length - 1) * w} ${height}`} className="h-28 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradientFrom} stopOpacity="0.35" />
            <stop offset="100%" stopColor={gradientTo} stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.polygon
          points={areaPoints}
          fill={`url(#${fillId})`}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.polyline
          points={points}
          fill="none"
          stroke={gradientFrom}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-slate-500">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </motion.div>
  );
}
