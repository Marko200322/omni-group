import { Body, Controller, Get, Post } from '@nestjs/common';
import { AddVaultResourceDto } from './dto/add-vault-resource.dto';
import { SupplyAgentService } from './supply-agent.service';

@Controller('supply')
export class SupplyCoreController {
  constructor(private readonly agent: SupplyAgentService) {}

  @Get('vault/status')
  status() {
    return this.agent.status();
  }

  @Post('vault/resource')
  addResource(@Body() body: AddVaultResourceDto) {
    return this.agent.addResource(
      body.provider,
      body.resourceType,
      body.label,
      body.payload,
    );
  }
}
