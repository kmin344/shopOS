import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { CustomField, EntityType } from '../entities/custom-field.entity';
import { CustomFieldService } from '../services/custom-field.service';
import { CreateCustomFieldInput } from '../dto/create-custom-field.input';
import { UpdateCustomFieldInput } from '../dto/update-custom-field.input';

@Resolver(() => CustomField)
export class CustomFieldResolver {
  constructor(private readonly customFieldService: CustomFieldService) {}

  @Query(() => [CustomField])
  async customFields(): Promise<CustomField[]> {
    return this.customFieldService.findAll();
  }

  @Query(() => [CustomField])
  async customFieldsByEntity(
    @Args('entityType', { type: () => EntityType }) entityType: EntityType,
  ): Promise<CustomField[]> {
    return this.customFieldService.findByEntityType(entityType);
  }

  @Query(() => CustomField)
  async customField(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<CustomField> {
    return this.customFieldService.findOne(id);
  }

  @Mutation(() => CustomField)
  async createCustomField(
    @Args('input') createCustomFieldInput: CreateCustomFieldInput,
  ): Promise<CustomField> {
    return this.customFieldService.create(createCustomFieldInput);
  }

  @Mutation(() => CustomField)
  async updateCustomField(
    @Args('input') updateCustomFieldInput: UpdateCustomFieldInput,
  ): Promise<CustomField> {
    return this.customFieldService.update(
      updateCustomFieldInput.id,
      updateCustomFieldInput,
    );
  }

  @Mutation(() => Boolean)
  async removeCustomField(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.customFieldService.remove(id);
  }
}
