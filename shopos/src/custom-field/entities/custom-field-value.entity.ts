import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { CustomField } from './custom-field.entity';

@ObjectType()
@Entity()
export class CustomFieldValue {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => CustomField)
  @ManyToOne(() => CustomField, { onDelete: 'CASCADE' })
  customField: CustomField;

  @Field()
  @Column()
  entityId: string;

  @Field()
  @Column('text')
  value: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
