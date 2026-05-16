import { Injectable } from '@nestjs/common';

/**
 * Blueprint: Phase Launch — centralno upravljanje fazama (v1 → v6+).
 * Npr. PHASE=v3 uključuje billing proširenja.
 */
@Injectable()
export class PhaseService {
  getPhase(): string {
    return process.env.PHASE ?? 'v1';
  }

  isBillingEnabled(): boolean {
    const p = this.getPhase();
    return p === 'v3' || p === 'v4' || p === 'v5' || p === 'v6' || p.startsWith('v6');
  }

  isAiEnabled(): boolean {
    const p = this.getPhase();
    return ['v3', 'v4', 'v5', 'v6'].includes(p) || p.startsWith('v6');
  }
}
