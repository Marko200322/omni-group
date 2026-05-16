import 'reflect-metadata';
import '../load-env';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Lead } from './entities/lead.entity';
import { Contract } from './entities/contract.entity';
import { Invoice } from './entities/invoice.entity';
import { VaultResource } from './entities/vault-resource.entity';
import { SupplyAgentHeartbeat } from './entities/supply-agent-heartbeat.entity';
import { InitialSchema1739126400000 } from './migrations/1739126400000-InitialSchema';
import { postgresSslOption } from './postgres-ssl.util';

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  username: process.env.POSTGRES_USER ?? 'atina',
  password: process.env.POSTGRES_PASSWORD ?? 'atina',
  database: process.env.POSTGRES_DB ?? 'atina',
  ssl: postgresSslOption(),
  entities: [User, Lead, Contract, Invoice, VaultResource, SupplyAgentHeartbeat],
  migrations: [InitialSchema1739126400000],
  synchronize: false,
});
