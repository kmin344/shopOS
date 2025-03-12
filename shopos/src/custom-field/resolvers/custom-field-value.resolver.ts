import { Resolver, Mutation, Args, ID } from '@nestjs/graphql';
import { CustomFieldValue } from '../entities/custom-field-value.entity';
import { CustomFieldValueService } from '../services/custom-field-value.service';

@Resolver(() => CustomFieldValue)
export class CustomFieldValueResolver {
  constructor(
    private readonly customFieldValueService: CustomFieldValueService,
  ) {}

  @Mutation(() => CustomFieldValue)
  async setCustomFieldValue(
    @Args('entityId', { type: () => ID }) entityId: string,
    @Args('customFieldId', { type: () => ID }) customFieldId: string,
    @Args('value') value: string,
  ): Promise<CustomFieldValue> {
    return this.customFieldValueService.setFieldValue(
      entityId,
      customFieldId,
      value,
    );
  }
}
