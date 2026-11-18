import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
} from 'typeorm';
import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';
import { Order } from './order.entity';
import { Product } from './product.entity';

/** One product line of an order. The unit price is copied at order time, so later price changes do not alter old orders. */
@ObjectType()
@Entity()
@Unique(['order', 'product'])
export class OrderItem {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  order: Order;

  @Field(() => Product)
  @ManyToOne(() => Product, { onDelete: 'RESTRICT', eager: true })
  product: Product;

  @Field(() => Int)
  @Column('int')
  quantity: number;

  @Field(() => Float)
  @Column('decimal', {
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  unitPrice: number;
}
