import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** TSC: Vault kao jedini izvor istine za resurse (PostgreSQL sloj). */
@Entity('vault_resources')
export class VaultResource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  provider: string;

  @Column({ name: 'resource_type', type: 'varchar', length: 128 })
  resourceType: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  label: string | null;

  @Column({ name: 'payload_json', type: 'text', nullable: true })
  payloadJson: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
