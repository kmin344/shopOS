import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';

export enum FieldType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  ENUM = 'ENUM',
}

export enum EntityType {
  PRODUCT = 'PRODUCT',
  CATEGORY = 'CATEGORY',
  ORDER = 'ORDER',
}

registerEnumType(FieldType, {
  name: 'FieldType',
});

registerEnumType(EntityType, {
  name: 'EntityType',
});

@ObjectType()
@Entity()
export class CustomField {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  name: string;

  @Field(() => FieldType)
  @Column({
    type: 'enum',
    enum: FieldType,
  })
  fieldType: FieldType;

  @Field(() => EntityType)
  @Column({
    type: 'enum',
    enum: EntityType,
  })
  entityType: EntityType;

  @Field({ nullable: true })
  @Column({ nullable: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  @Column('simple-array', { nullable: true })
  enumValues?: string[];

  @Field({ nullable: true })
  @Column({ nullable: true })
  defaultValue?: string;

  @Field()
  @Column({ default: true })
  isRequired: boolean;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
