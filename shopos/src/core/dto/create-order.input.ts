import { InputType, Field } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty } from 'class-validator';

@InputType()
export class CreateOrderInput {
  @ApiProperty({
    description: 'Array of product IDs to include in the order',
    type: [String],
  })
  @Field(() => [String])
  @IsArray()
  @IsNotEmpty()
  productIds: string[];
}
