import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCatalogos1730000000003 implements MigrationInterface {
  name = 'CreateCatalogos1730000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "catalogos" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "sector" character varying(100),
        "file_name" character varying(255) NOT NULL,
        "file_path" character varying(512) NOT NULL,
        "mime_type" character varying(100) NOT NULL DEFAULT 'application/pdf',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_catalogos" PRIMARY KEY ("id"),
        CONSTRAINT "FK_catalogos_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_catalogos_tenant_id" ON "catalogos" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_catalogos_tenant_sector" ON "catalogos" ("tenant_id", "sector")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_catalogos_tenant_sector"`);
    await queryRunner.query(`DROP INDEX "IDX_catalogos_tenant_id"`);
    await queryRunner.query(`DROP TABLE "catalogos"`);
  }
}
