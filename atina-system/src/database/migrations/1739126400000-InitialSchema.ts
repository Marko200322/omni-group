import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1739126400000 implements MigrationInterface {
  name = 'InitialSchema1739126400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(255) NOT NULL,
        "password_hash" text NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "leads" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "email" character varying(255) NOT NULL,
        "status" character varying(50) NOT NULL DEFAULT 'NEW',
        "user_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_leads" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "contracts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "status" character varying(50) NOT NULL DEFAULT 'DRAFT',
        "value" numeric(14,2) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contracts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_contracts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "contract_id" uuid NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "status" character varying(50) NOT NULL DEFAULT 'PENDING',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_invoices_contract" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "vault_resources" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "provider" character varying(64) NOT NULL,
        "resource_type" character varying(128) NOT NULL,
        "label" character varying(512),
        "payload_json" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vault_resources" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "supply_agent_heartbeats" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "resource_count" integer NOT NULL DEFAULT 0,
        "pending_workers" integer NOT NULL DEFAULT 0,
        "phase" character varying(32),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_supply_agent_heartbeats" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contracts" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leads" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vault_resources" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "supply_agent_heartbeats" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
  }
}
