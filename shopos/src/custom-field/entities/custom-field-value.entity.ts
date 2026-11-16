import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { CustomField } from './custom-field.entity';

@ObjectType()
@Entity()
// One value per field per entity. Also serves as the lookup index for entityId.
@Unique(['entityId', 'customField'])
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
