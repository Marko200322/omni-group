import { ForbiddenException } from '@nestjs/common';

const ENV_NAME = 'INTERNAL_QUEUE_SMOKE_KEY';

/** Ako je u env postavljen `INTERNAL_QUEUE_SMOKE_KEY`, POST /internal/queue/smoke mora slati isti ključ u headeru `x-internal-queue-smoke-key`. */
export function assertInternalQueueSmokeKey(headerValue: string | undefined): void {
  const expected = process.env[ENV_NAME]?.trim();
  if (!expected) {
    return;
  }
  const provided = headerValue?.trim();
  if (!provided || provided !== expected) {
    throw new ForbiddenException();
  }
}
