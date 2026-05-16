import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('supply_agent_heartbeats')
export class SupplyAgentHeartbeat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'resource_count', type: 'int', default: 0 })
  resourceCount: number;

  @Column({ name: 'pending_workers', type: 'int', default: 0 })
  pendingWorkers: number;

  @Column({ name: 'phase', type: 'varchar', length: 32, nullable: true })
  phase: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
