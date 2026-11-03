import { InputType, Field } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

@InputType()
export class CreateOrderInput {
  @ApiProperty({
    description: 'Distinct product IDs to include in the order',
    type: [String],
  })
  @Field(() => [String])
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  productIds: string[];
}
