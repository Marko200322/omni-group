import { monitoringBffPost } from '@/lib/monitoring-bff';

export async function POST(req: Request) {
  return monitoringBffPost('/engine/run', req);
}
