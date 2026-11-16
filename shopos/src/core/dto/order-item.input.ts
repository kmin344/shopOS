import { InputType, Field, Int } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

export const MAX_ITEM_QUANTITY = 10_000;

@InputType()
export class OrderItemInput {
  @ApiProperty({ description: 'Product ID' })
  @Field()
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Units to order',
    minimum: 1,
    maximum: MAX_ITEM_QUANTITY,
  })
  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(MAX_ITEM_QUANTITY)
  quantity: number;
}
