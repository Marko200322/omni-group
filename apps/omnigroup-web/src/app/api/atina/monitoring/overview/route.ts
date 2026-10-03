import { monitoringBffGet } from '@/lib/monitoring-bff';

export async function GET() {
  return monitoringBffGet('/overview');
}
