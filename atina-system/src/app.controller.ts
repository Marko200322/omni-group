import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Optional,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { assertInternalQueueSmokeKey } from './internal/assert-internal-queue-smoke-key';
import {
  assertInternalQueueSmokeRateLimit,
  clientKeyFromQueueSmokeRequest,
} from './internal/assert-internal-queue-smoke-rate-limit';
import { HealthService } from './health/health.service';
import { SystemQueueService } from './queue/system-queue.service';

@Controller()
export class AppController {
  constructor(
    private readonly healthService: HealthService,
    @Optional() private readonly systemQueueService?: SystemQueueService,
  ) {}

  @Get(['', 'health'])
  async health() {
    return this.healthService.buildHealthResponse();
  }

  /**
   * Dev / staging: enqueue jedan posao na red `system` (Bull). U produkciji isključeno.
   */
  @Post('internal/queue/smoke')
  @HttpCode(HttpStatus.OK)
  async enqueueQueueSmoke(
    @Req() req: Request,
    @Headers('x-internal-queue-smoke-key') internalQueueSmokeKey?: string | string[],
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    assertInternalQueueSmokeRateLimit(clientKeyFromQueueSmokeRequest(req));
    const keyHeader = Array.isArray(internalQueueSmokeKey)
      ? internalQueueSmokeKey[0]
      : internalQueueSmokeKey;
    assertInternalQueueSmokeKey(keyHeader);
    if (!this.systemQueueService) {
      return { bull: false, message: 'Set REDIS_HOST to enable BullMQ' };
    }
    const { jobId } = await this.systemQueueService.enqueueSmokeJob();
    return { bull: true, queue: 'system', jobId };
  }
}
