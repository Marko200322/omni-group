import { DynamicModule, Module, Type } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SystemQueueProcessor } from './system-queue.processor';
import { SystemQueueService } from './system-queue.service';

function buildQueueMetadata(): {
  imports: DynamicModule[];
  providers: Type<unknown>[];
} {
  const host = process.env.REDIS_HOST?.trim();
  if (!host) {
    return { imports: [], providers: [] };
  }
  const connection = {
    host,
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  };
  return {
    imports: [
      BullModule.forRoot({ connection }),
      BullModule.registerQueue({ name: 'system' }),
    ],
    providers: [SystemQueueProcessor, SystemQueueService] as Type<unknown>[],
  };
}

const meta = buildQueueMetadata();

@Module({
  imports: meta.imports,
  providers: meta.providers,
  exports: meta.imports.length > 0 ? [BullModule, SystemQueueService] : [],
})
export class QueueModule {}
