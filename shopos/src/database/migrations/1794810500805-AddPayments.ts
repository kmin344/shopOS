import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayments1794810500805 implements MigrationInterface {
  name = 'AddPayments1794810500805';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."payment_status_enum" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" uuid NOT NULL, "provider" character varying NOT NULL, "providerPaymentId" character varying, "amount" numeric(10,2) NOT NULL, "currency" character varying(3) NOT NULL, "status" "public"."payment_status_enum" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8c27a772942a719f0946900c117" UNIQUE ("providerPaymentId"), CONSTRAINT "PK_fcaec7df5adf9cac408c686b2ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d09d285fe1645cd2f0db811e29" ON "payment" ("orderId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "FK_d09d285fe1645cd2f0db811e293" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "FK_d09d285fe1645cd2f0db811e293"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d09d285fe1645cd2f0db811e29"`,
    );
    await queryRunner.query(`DROP TABLE "payment"`);
    await queryRunner.query(`DROP TYPE "public"."payment_status_enum"`);
  }
}
