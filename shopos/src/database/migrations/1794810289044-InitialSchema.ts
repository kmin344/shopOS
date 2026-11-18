import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1794810289044 implements MigrationInterface {
  name = 'InitialSchema1794810289044';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // uuid_generate_v4() below comes from this extension.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "public"."custom_field_fieldtype_enum" AS ENUM('STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'ENUM')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."custom_field_entitytype_enum" AS ENUM('PRODUCT', 'CATEGORY', 'ORDER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "custom_field" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "fieldType" "public"."custom_field_fieldtype_enum" NOT NULL, "entityType" "public"."custom_field_entitytype_enum" NOT NULL, "description" character varying, "enumValues" text, "defaultValue" character varying, "isRequired" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_70c7eb2dfb5b81c051a6ba3ace8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "custom_field_value" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entityId" character varying NOT NULL, "value" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "customFieldId" uuid, CONSTRAINT "UQ_92d1f83b9512e65307395dc0fe4" UNIQUE ("entityId", "customFieldId"), CONSTRAINT "PK_1799a7f1082505c7caa9098d924" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "category" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "product" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "price" numeric(10,2) NOT NULL, "stock" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "categoryId" uuid, CONSTRAINT "PK_bebc9158e480b949565b4dc7a82" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."order_status_enum" AS ENUM('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "order" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."order_status_enum" NOT NULL DEFAULT 'PENDING', "totalAmount" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1031171c13130102495201e3e20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" integer NOT NULL, "unitPrice" numeric(10,2) NOT NULL, "orderId" uuid, "productId" uuid, CONSTRAINT "UQ_7e383dc486afc7800bf87d1c11a" UNIQUE ("orderId", "productId"), CONSTRAINT "PK_d01158fe15b1ead5c26fd7f4e90" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_field_value" ADD CONSTRAINT "FK_1e8a05f4de6b3cd8b2eaef9d595" FOREIGN KEY ("customFieldId") REFERENCES "custom_field"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ADD CONSTRAINT "FK_ff0c0301a95e517153df97f6812" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" ADD CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" ADD CONSTRAINT "FK_904370c093ceea4369659a3c810" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_item" DROP CONSTRAINT "FK_904370c093ceea4369659a3c810"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" DROP CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" DROP CONSTRAINT "FK_ff0c0301a95e517153df97f6812"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_field_value" DROP CONSTRAINT "FK_1e8a05f4de6b3cd8b2eaef9d595"`,
    );
    await queryRunner.query(`DROP TABLE "order_item"`);
    await queryRunner.query(`DROP TABLE "order"`);
    await queryRunner.query(`DROP TYPE "public"."order_status_enum"`);
    await queryRunner.query(`DROP TABLE "product"`);
    await queryRunner.query(`DROP TABLE "category"`);
    await queryRunner.query(`DROP TABLE "custom_field_value"`);
    await queryRunner.query(`DROP TABLE "custom_field"`);
    await queryRunner.query(
      `DROP TYPE "public"."custom_field_entitytype_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."custom_field_fieldtype_enum"`);
  }
}
