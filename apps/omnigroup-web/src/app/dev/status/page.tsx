import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';

import { StatusKanonDashboard } from '@/components/dev/StatusKanonDashboard';

export const metadata: Metadata = {
  title: 'Status kanon',
  description: 'P0–P3 kanonska lista — šta fali, šta radi.',
  robots: { index: false, follow: false },
};

function parseEmptyKeysFile(mdPath: string): { rows: { name: string; source: string }[]; empty: number; set: number } {
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

function loadEmptyKeys() {
  const candidates = [
    path.join(process.cwd(), 'src', 'data', 'empty-keys.md'),
    path.resolve(process.cwd(), '..', '..', 'docs', 'generated', 'EMPTY-KEYS.md'),
  ];
  for (const mdPath of candidates) {
    if (fs.existsSync(mdPath)) {
      return parseEmptyKeysFile(mdPath);
    }
  }
  return { rows: [], empty: 0, set: 0 };
}

export type ProdAuditRow = { id: string; check: string; status: string; note: string };

function parseProdAuditFile(mdPath: string): { rows: ProdAuditRow[]; summary: string; generated: string } {
  if (!fs.existsSync(mdPath)) {
    return { rows: [], summary: '', generated: '' };
  }
  const text = fs.readFileSync(mdPath, 'utf8');
  const generated = text.match(/\*\*Generated:\*\*\s*(.+)/)?.[1]?.trim() ?? '';
  const summary = text.match(/\*\*Summary:\*\*\s*(.+)/)?.[1]?.trim() ?? '';
  const rows: ProdAuditRow[] = [];
  const re = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*\*\*([^*]+)\*\*\s*\|\s*([^|]+?)\s*\|/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const id = m[1].trim();
    if (id === 'ID' || id.startsWith('---')) continue;
    rows.push({ id, check: m[2].trim(), status: m[3].trim(), note: m[4].trim() });
  }
  return { rows, summary, generated };
}

function loadProdAudit() {
  const candidates = [
    path.join(process.cwd(), 'src', 'data', 'prod-audit.md'),
    path.resolve(process.cwd(), '..', '..', 'docs', 'generated', 'PROD-AUDIT.md'),
  ];
  for (const mdPath of candidates) {
    if (fs.existsSync(mdPath)) {
      return parseProdAuditFile(mdPath);
    }
  }
  return { rows: [], summary: '', generated: '' };
}

export default function DevStatusPage() {
  const { rows, empty, set } = loadEmptyKeys();
  const prodAudit = loadProdAudit();
  return (
    <StatusKanonDashboard
      emptyKeys={rows}
      emptyCount={empty}
      setCount={set}
      prodAudit={prodAudit.rows}
      prodAuditSummary={prodAudit.summary}
      prodAuditGenerated={prodAudit.generated}
    />
  );
}
