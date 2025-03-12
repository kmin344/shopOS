import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Category } from '../entities/category.entity';
import { CustomFieldValue } from '../../custom-field/entities/custom-field-value.entity';
import { CustomFieldValueService } from '../../custom-field/services/custom-field-value.service';
import { EntityType } from '../../custom-field/entities/custom-field.entity';

@Resolver(() => Category)
export class CategoryCustomFieldsResolver {
  constructor(
    private readonly customFieldValueService: CustomFieldValueService,
  ) {}

  @ResolveField(() => [CustomFieldValue])
  async customFieldValues(
    @Parent() category: Category,
  ): Promise<CustomFieldValue[]> {
    return this.customFieldValueService.getFieldValues(
      category.id,
      EntityType.CATEGORY,
    );
  }
}
