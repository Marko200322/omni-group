import { Request, Response, NextFunction } from 'express';
import { config } from '../../config';
import { sendError } from '../../utils/response';

function envFlag(value: string | undefined): 'true' | 'false' | 'unset' {
  const v = (value ?? '').trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return 'true';
  if (v === 'false' || v === '0' || v === 'no') return 'false';
  return 'unset';
}

/** Production is closed unless REGISTRATION_ENABLED is true. Dev stays open unless explicitly false. */
export function isPublicRegistrationOpen(): boolean {
  const flag = envFlag(process.env.REGISTRATION_ENABLED);
  if (config.app.env === 'production') {
    return flag === 'true';
  }
  return flag !== 'false';
}

/** When public registration is closed, block POST /register. */
export function registrationGate(_req: Request, res: Response, next: NextFunction): void {
  if (!isPublicRegistrationOpen()) {
    sendError(res, 'Registration is disabled on this instance', 403, 'REGISTRATION_DISABLED');
    return;
  }
  next();
}
