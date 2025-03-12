import { InputType, Field, ID } from '@nestjs/graphql';
import { IsArray, IsNotEmpty } from 'class-validator';

@InputType()
export class CreateOrderInput {
  @Field(() => [ID])
  @IsArray()
  @IsNotEmpty()
  productIds: string[];
}
