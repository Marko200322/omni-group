import { Global, Module } from '@nestjs/common';
import { PhaseService } from './phase.service';

@Global()
@Module({
  providers: [PhaseService],
  exports: [PhaseService],
})
export class PhaseLaunchModule {}
