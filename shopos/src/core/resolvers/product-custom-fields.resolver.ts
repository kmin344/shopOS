import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Product } from '../entities/product.entity';
import { CustomFieldValue } from '../../custom-field/entities/custom-field-value.entity';
import { CustomFieldValueService } from '../../custom-field/services/custom-field-value.service';
import { EntityType } from '../../custom-field/entities/custom-field.entity';

@Resolver(() => Product)
export class ProductCustomFieldsResolver {
  constructor(
    private readonly customFieldValueService: CustomFieldValueService,
  ) {}

  @ResolveField(() => [CustomFieldValue])
  async customFieldValues(
    @Parent() product: Product,
  ): Promise<CustomFieldValue[]> {
    return this.customFieldValueService.getFieldValues(
      product.id,
      EntityType.PRODUCT,
    );
  }
}
