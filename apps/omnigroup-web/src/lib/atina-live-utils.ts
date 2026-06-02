export function formatRelativeTime(iso?: string): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

export function mapTaskStatus(status: string): 'running' | 'done' | 'queued' {
  if (['completed'].includes(status)) return 'done';
  if (['running', 'retrying'].includes(status)) return 'running';
  return 'queued';
}

export function taskProgress(status: string): number {
  if (status === 'completed') return 100;
  if (status === 'running') return 55;
  if (status === 'failed') return 100;
  return 0;
}
