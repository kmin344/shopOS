import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { Category } from './category.entity';
import { HasCustomFields } from '../../custom-field/interfaces/has-custom-fields.interface';
import { CustomFieldValue } from '../../custom-field/entities/custom-field-value.entity';

@ObjectType({ implements: () => [HasCustomFields] })
@Entity()
export class Product implements HasCustomFields {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  name: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  description?: string;

  @Field(() => Float)
  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Field(() => Int)
  @Column({ default: 0 })
  stock: number;

  @Field(() => Category)
  @ManyToOne(() => Category, (category) => category.products)
  category: Category;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field(() => [CustomFieldValue], { nullable: true })
  customFieldValues?: CustomFieldValue[];
}
