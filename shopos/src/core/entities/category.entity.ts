import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Product } from './product.entity';
import { HasCustomFields } from '../../custom-field/interfaces/has-custom-fields.interface';
import { CustomFieldValue } from '../../custom-field/entities/custom-field-value.entity';

@ObjectType({ implements: () => [HasCustomFields] })
@Entity()
export class Category implements HasCustomFields {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  name: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  description?: string;

  @Field(() => [Product])
  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field(() => [CustomFieldValue], { nullable: true })
  customFieldValues?: CustomFieldValue[];
}
