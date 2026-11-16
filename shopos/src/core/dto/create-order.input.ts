import { InputType, Field } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { OrderItemInput } from './order-item.input';

@InputType()
export class CreateOrderInput {
  @ApiProperty({
    description: 'Order lines. Each product may appear once.',
    type: [OrderItemInput],
  })
  @Field(() => [OrderItemInput])
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((item: OrderItemInput) => item.productId)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items: OrderItemInput[];
}
