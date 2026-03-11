import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates catalog_areas table and adds area_id to catalogos (optional classification per tenant).
 */
export class CreateCatalogAreasAndAddAreaIdToCatalogos1730000000005 implements MigrationInterface {
  name = 'CreateCatalogAreasAndAddAreaIdToCatalogos1730000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "catalog_areas" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "display_order" integer,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_catalog_areas" PRIMARY KEY ("id"),
        CONSTRAINT "FK_catalog_areas_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_catalog_areas_tenant_id" ON "catalog_areas" ("tenant_id")`);
    await queryRunner.query(`
      ALTER TABLE "catalogos"
      ADD COLUMN "area_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "catalogos"
      ADD CONSTRAINT "FK_catalogos_area" FOREIGN KEY ("area_id") REFERENCES "catalog_areas"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`CREATE INDEX "IDX_catalogos_area_id" ON "catalogos" ("area_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_catalogos_area_id"`);
    await queryRunner.query(`ALTER TABLE "catalogos" DROP CONSTRAINT "FK_catalogos_area"`);
    await queryRunner.query(`ALTER TABLE "catalogos" DROP COLUMN "area_id"`);
    await queryRunner.query(`DROP INDEX "IDX_catalog_areas_tenant_id"`);
    await queryRunner.query(`DROP TABLE "catalog_areas"`);
  }
}
