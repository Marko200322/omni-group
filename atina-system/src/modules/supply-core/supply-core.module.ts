import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplyAgentHeartbeat } from '../../database/entities/supply-agent-heartbeat.entity';
import { VaultResource } from '../../database/entities/vault-resource.entity';
import { SupplyCoreController } from './supply-core.controller';
import { SupplyAgentService } from './supply-agent.service';

@Module({
  imports: [TypeOrmModule.forFeature([VaultResource, SupplyAgentHeartbeat])],
  controllers: [SupplyCoreController],
  providers: [SupplyAgentService],
  exports: [SupplyAgentService],
})
export class SupplyCoreModule {}
