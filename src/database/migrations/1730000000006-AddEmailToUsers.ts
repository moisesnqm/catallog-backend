import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds optional email column to users for display in admin list (filled on link by email).
 */
export class AddEmailToUsers1730000000006 implements MigrationInterface {
  name = 'AddEmailToUsers1730000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "email" character varying(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email"`);
  }
}
