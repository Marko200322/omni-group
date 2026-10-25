/**
 * Monitoring scheduler + marketing probe wiring (no live DB required for unit shape).
 */
import { SUBSYSTEM_CODES } from '../../modules/monitoring/lib/constants';

describe('monitoring scheduler wiring', () => {
  it('includes marketing in subsystem codes for UI + cron probes', () => {
    expect(SUBSYSTEM_CODES).toContain('marketing');
    expect(SUBSYSTEM_CODES).toContain('monitoring');
    expect(SUBSYSTEM_CODES).toContain('api');
  });

  it('exports scheduler singleton helpers', async () => {
    const mod = await import('../../modules/monitoring/service/monitoring-scheduler.service');
    expect(typeof mod.getMonitoringScheduler).toBe('function');
    expect(typeof mod.stopMonitoringScheduler).toBe('function');
    const status = mod.getMonitoringScheduler().getStatus();
    expect(status).toHaveProperty('enabled');
    expect(status).toHaveProperty('intervalMs');
    expect(status).toHaveProperty('running');
    mod.stopMonitoringScheduler();
  });

  it('runAllProbes includes marketing probe', async () => {
    const { runAllProbes } = await import('../../modules/monitoring/lib/probes');
    const probes = await runAllProbes();
    const codes = probes.map((p) => p.code);
    expect(codes).toContain('marketing');
    expect(codes).toContain('api');
    expect(codes).toContain('monitoring');
    // fail-soft: every probe returns a status
    for (const p of probes) {
      expect(['healthy', 'warning', 'critical', 'unavailable', 'unknown']).toContain(p.status);
      expect(typeof p.message).toBe('string');
    }
  });
});
