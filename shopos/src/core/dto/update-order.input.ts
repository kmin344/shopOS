import { InputType, Field, ID, PartialType } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';
import { CreateOrderInput } from './create-order.input';

@InputType()
export class UpdateOrderInput extends PartialType(CreateOrderInput) {
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
