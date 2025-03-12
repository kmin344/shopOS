import { InputType, Field, ID, PartialType } from '@nestjs/graphql';
import { CreateCustomFieldInput } from './create-custom-field.input';

@InputType()
export class UpdateCustomFieldInput extends PartialType(
  CreateCustomFieldInput,
) {
  @Field(() => ID)
  id: string;
}
