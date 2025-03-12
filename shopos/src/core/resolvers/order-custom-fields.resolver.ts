import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Order } from '../entities/order.entity';
import { CustomFieldValue } from '../../custom-field/entities/custom-field-value.entity';
import { CustomFieldValueService } from '../../custom-field/services/custom-field-value.service';
import { EntityType } from '../../custom-field/entities/custom-field.entity';

@Resolver(() => Order)
export class OrderCustomFieldsResolver {
  constructor(
    private readonly customFieldValueService: CustomFieldValueService,
  ) {}

  @ResolveField(() => [CustomFieldValue])
  async customFieldValues(@Parent() order: Order): Promise<CustomFieldValue[]> {
    return this.customFieldValueService.getFieldValues(
      order.id,
      EntityType.ORDER,
    );
  }
}
