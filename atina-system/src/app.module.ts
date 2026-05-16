import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { CoreModule } from './core/core.module';
import { Contract } from './database/entities/contract.entity';
import { Invoice } from './database/entities/invoice.entity';
import { Lead } from './database/entities/lead.entity';
import { SupplyAgentHeartbeat } from './database/entities/supply-agent-heartbeat.entity';
import { User } from './database/entities/user.entity';
import { VaultResource } from './database/entities/vault-resource.entity';
import { postgresSslOption } from './database/postgres-ssl.util';
import { AiModule } from './modules/ai/ai.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { CrmModule } from './modules/crm/crm.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SupplyCoreModule } from './modules/supply-core/supply-core.module';
import { UsersModule } from './modules/users/users.module';
import { PhaseLaunchModule } from './phase-launch/phase-launch.module';
import { HealthService } from './health/health.service';
import { QueueModule } from './queue/queue.module';

const isProduction = process.env.NODE_ENV === 'production';
const e2eWithDb = process.env.E2E_WITH_DB === '1';
/** In production schema changes must use TypeORM migrations, never synchronize. */
/** E2E sa pravom bazom koristi šemu iz migracija (bez sync). */
const typeOrmSynchronize =
  !isProduction &&
  !e2eWithDb &&
  process.env.TYPEORM_SYNC !== 'false';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    QueueModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
      username: process.env.POSTGRES_USER ?? 'atina',
      password: process.env.POSTGRES_PASSWORD ?? 'atina',
      database: process.env.POSTGRES_DB ?? 'atina',
      ssl: postgresSslOption(),
      entities: [
        User,
        Lead,
        Contract,
        Invoice,
        VaultResource,
        SupplyAgentHeartbeat,
      ],
      synchronize: typeOrmSynchronize,
      logging: process.env.TYPEORM_LOG === 'true',
    }),
    CoreModule,
    PhaseLaunchModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    CrmModule,
    ContractsModule,
    BillingModule,
    AnalyticsModule,
    AiModule,
    SupplyCoreModule,
  ],
  controllers: [AppController],
  providers: [HealthService],
})
export class AppModule {}
