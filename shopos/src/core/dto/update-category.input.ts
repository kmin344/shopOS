import { InputType, Field, ID, PartialType } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { CreateCategoryInput } from './create-category.input';

@InputType()
export class UpdateCategoryInput extends PartialType(CreateCategoryInput) {
  @ApiProperty({ description: 'Category ID' })
  @Field(() => ID)
  id: string;
}
