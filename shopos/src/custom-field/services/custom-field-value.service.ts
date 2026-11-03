import { Injectable, NotFoundException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CustomFieldValue } from '../entities/custom-field-value.entity';
import { EntityType } from '../entities/custom-field.entity';
import { CustomFieldService } from './custom-field.service';

@Injectable()
export class CustomFieldValueService {
  constructor(
    @InjectRepository(CustomFieldValue)
    private customFieldValueRepository: Repository<CustomFieldValue>,
    private customFieldService: CustomFieldService,
    private dataSource: DataSource,
  ) {}

  // Entity names are used instead of classes to avoid a circular import
  // between the core and custom-field modules.
  private static readonly entityNames: Record<EntityType, string> = {
    [EntityType.PRODUCT]: 'Product',
    [EntityType.CATEGORY]: 'Category',
    [EntityType.ORDER]: 'Order',
  };

  private async assertEntityExists(entityType: EntityType, entityId: string) {
    const exists =
      isUUID(entityId) &&
      (await this.dataSource
        .getRepository(CustomFieldValueService.entityNames[entityType])
        .exists({ where: { id: entityId } }));
    if (!exists) {
      throw new NotFoundException(
        `${CustomFieldValueService.entityNames[entityType]} ${entityId} not found`,
      );
    }
  }

  async setFieldValue(
    entityId: string,
    customFieldId: string,
    value: string,
  ): Promise<CustomFieldValue> {
    const customField = await this.customFieldService.findOne(customFieldId);
    await this.assertEntityExists(customField.entityType, entityId);

    let fieldValue = await this.customFieldValueRepository.findOne({
      where: {
        entityId,
        customField: { id: customFieldId },
      },
      relations: ['customField'],
    });

    if (!fieldValue) {
      fieldValue = this.customFieldValueRepository.create({
        entityId,
        customField,
        value,
      });
    } else {
      fieldValue.value = value;
    }

    return await this.customFieldValueRepository.save(fieldValue);
  }

  async getFieldValues(
    entityId: string,
    entityType: EntityType,
  ): Promise<CustomFieldValue[]> {
    const customFields =
      await this.customFieldService.findByEntityType(entityType);

    if (customFields.length === 0) {
      return [];
    }

    return await this.customFieldValueRepository.find({
      where: {
        entityId,
        customField: { id: In(customFields.map((cf) => cf.id)) },
      },
      relations: ['customField'],
    });
  }
}
