import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds file_url and searchable_text to catalogos; makes file_path nullable for S3-only records.
 * Adds GIN index for full-text search on searchable_text.
 */
export class AddCatalogoFileUrlAndSearchableText1730000000004 implements MigrationInterface {
  name = 'AddCatalogoFileUrlAndSearchableText1730000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "catalogos"
      ADD COLUMN "file_url" character varying(1024),
      ADD COLUMN "searchable_text" text
    `);
    await queryRunner.query(`
      ALTER TABLE "catalogos"
      ALTER COLUMN "file_path" DROP NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_catalogos_searchable_text_fts"
      ON "catalogos"
      USING gin(to_tsvector('portuguese', COALESCE("searchable_text", '')))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_catalogos_searchable_text_fts"`);
    await queryRunner.query(`
      ALTER TABLE "catalogos"
      DROP COLUMN "searchable_text",
      DROP COLUMN "file_url"
    `);
    await queryRunner.query(`
      ALTER TABLE "catalogos"
      ALTER COLUMN "file_path" SET NOT NULL
    `);
  }
}
