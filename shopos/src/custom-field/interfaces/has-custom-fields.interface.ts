import { Field, InterfaceType } from '@nestjs/graphql';
import { CustomFieldValue } from '../entities/custom-field-value.entity';

@InterfaceType()
export abstract class HasCustomFields {
  @Field(() => [CustomFieldValue], { nullable: true })
  customFieldValues?: CustomFieldValue[];
}
