import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';

import { StatusKanonDashboard } from '@/components/dev/StatusKanonDashboard';

export const metadata: Metadata = {
  title: 'Status kanon',
  description: 'P0–P3 kanonska lista — šta fali, šta radi.',
  robots: { index: false, follow: false },
};

function parseEmptyKeys(repoRoot: string): { rows: { name: string; source: string }[]; empty: number; set: number } {
  const mdPath = path.join(repoRoot, 'docs', 'generated', 'EMPTY-KEYS.md');
  if (!fs.existsSync(mdPath)) {
    return { rows: [], empty: 0, set: 0 };
  }
  const text = fs.readFileSync(mdPath, 'utf8');
  const summary = text.match(/\*\*Summary:\*\*\s*(\d+)\s*EMPTY\s*·\s*(\d+)\s*SET/);
  const empty = summary ? Number(summary[1]) : 0;
  const set = summary ? Number(summary[2]) : 0;
  const inEmpty = text.indexOf('## EMPTY');
  const setHeader = text.indexOf('## SET');
  const afterEmpty =
    inEmpty >= 0 ? text.slice(inEmpty, setHeader >= 0 ? setHeader : undefined) : '';
  const rows: { name: string; source: string }[] = [];
  const re = /\|\s*`([^`]+)`\s*\|\s*(\w+)\s*\|/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(afterEmpty)) !== null) {
    if (m[1] === 'Key') continue;
    rows.push({ name: m[1], source: m[2] });
    if (rows.length >= 50) break;
  }
  return { rows, empty, set };
}

export default function DevStatusPage() {
  const repoRoot = path.resolve(process.cwd(), '..', '..');
  const { rows, empty, set } = parseEmptyKeys(repoRoot);

  return <StatusKanonDashboard emptyKeys={rows} emptyCount={empty} setCount={set} />;
}
