import { InputType, Field, ID } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

/** Only the status can change after an order is placed. Order lines are fixed. */
@InputType()
export class UpdateOrderInput {
  @ApiProperty({ description: 'Order ID' })
  @Field(() => ID)
  id: string;

  @ApiProperty({
    description: 'Order status',
    enum: OrderStatus,
    required: false,
  })
  @Field(() => OrderStatus, { nullable: true })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;
}
