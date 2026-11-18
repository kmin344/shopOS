import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  Field,
  Float,
  ID,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';
import { Order } from '../../core/entities/order.entity';

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}
registerEnumType(PaymentStatus, { name: 'PaymentStatus' });

@ObjectType()
@Entity()
export class Payment {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Field(() => ID)
  @Index()
  @Column('uuid')
  orderId: string;

  @Field()
  @Column()
  provider: string;

  /** Set once the provider accepts the payment. */
  @Field({ nullable: true })
  @Column({ nullable: true, unique: true })
  providerPaymentId?: string;

  @Field(() => Float)
  @Column('decimal', {
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  amount: number;

  @Field()
  @Column({ length: 3 })
  currency: string;

  @Field(() => PaymentStatus)
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
