#!/usr/bin/env node
/** Generiše SVG portrete za avatar timove (WFH / solo preduzetnik). */
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../apps/omnigroup-web/public/avatars/portraits');
mkdirSync(outDir, { recursive: true });

const agents = [
  { id: 'mila', skin: '#f5d0c5', hair: '#3d2314', shirt: '#6366f1', accent: '#818cf8' },
  { id: 'stefan', skin: '#e8c4a8', hair: '#1a1a2e', shirt: '#0ea5e9', accent: '#38bdf8' },
  { id: 'jelena', skin: '#f0d5c4', hair: '#5c3d2e', shirt: '#10b981', accent: '#34d399' },
  { id: 'nemanja', skin: '#d4a574', hair: '#0f0f0f', shirt: '#8b5cf6', accent: '#a78bfa' },
  { id: 'sara', skin: '#f5d0c5', hair: '#2d1b0e', shirt: '#f59e0b', accent: '#fbbf24' },
  { id: 'nikola', skin: '#e8c4a8', hair: '#252525', shirt: '#7c3aed', accent: '#a78bfa' },
  { id: 'ana', skin: '#f0d5c4', hair: '#1a1a1a', shirt: '#ec4899', accent: '#f472b6' },
  { id: 'marko', skin: '#d4a574', hair: '#3d2314', shirt: '#06b6d4', accent: '#22d3ee' },
  { id: 'ivana', skin: '#f5d0c5', hair: '#4a3728', shirt: '#14b8a6', accent: '#2dd4bf' },
  { id: 'luka', skin: '#e8c4a8', hair: '#1e1e1e', shirt: '#3b82f6', accent: '#60a5fa' },
  { id: 'teodora', skin: '#f0d5c4', hair: '#5c3d2e', shirt: '#d946ef', accent: '#e879f9' },
];

function svg(agent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" fill="none">
  <defs>
    <linearGradient id="bg-${agent.id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${agent.accent}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="400" height="500" fill="url(#bg-${agent.id})"/>
  <ellipse cx="200" cy="430" rx="120" ry="40" fill="#000" opacity="0.15"/>
  <path d="M100 480c20-80 60-120 100-120s80 40 100 120H100z" fill="${agent.shirt}"/>
  <path d="M130 200c0-55 30-95 70-95s70 40 70 95c0 30-10 55-25 70H155c-15-15-25-40-25-70z" fill="${agent.hair}"/>
  <ellipse cx="200" cy="220" rx="72" ry="82" fill="${agent.skin}"/>
  <ellipse cx="168" cy="210" rx="10" ry="12" fill="#1e293b"/>
  <ellipse cx="232" cy="210" rx="10" ry="12" fill="#1e293b"/>
  <path d="M185 250q15 12 30 0" stroke="#c4a484" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M155 175c15-20 75-20 90 0" stroke="${agent.hair}" stroke-width="8" fill="none" stroke-linecap="round"/>
</svg>`;
}

for (const a of agents) {
  writeFileSync(join(outDir, `${a.id}.svg`), svg(a), 'utf8');
}
console.log(`Wrote ${agents.length} portraits -> ${outDir}`);
