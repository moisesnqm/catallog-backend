import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1730000000002 implements MigrationInterface {
  name = 'CreateUsers1730000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "clerk_user_id" character varying(255) NOT NULL,
        "role" character varying(50) NOT NULL,
        "sector_access" character varying(50) NOT NULL DEFAULT 'all',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_tenant_clerk" UNIQUE ("tenant_id", "clerk_user_id"),
        CONSTRAINT "FK_users_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_users_tenant_id" ON "users" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_clerk_user_id" ON "users" ("clerk_user_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_users_clerk_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_users_tenant_id"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
