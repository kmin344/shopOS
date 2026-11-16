import { Injectable, NotFoundException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryFailedError, Repository } from 'typeorm';
import { CustomFieldValue } from '../entities/custom-field-value.entity';
import { EntityType } from '../entities/custom-field.entity';
import { CustomFieldService } from './custom-field.service';
import { validateFieldValue } from '../validate-value';

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
    validateFieldValue(customField, value);
    await this.assertEntityExists(customField.entityType, entityId);

    const findExisting = () =>
      this.customFieldValueRepository.findOne({
        where: { entityId, customField: { id: customFieldId } },
        relations: ['customField'],
      });

    const existing = await findExisting();
    if (existing) {
      existing.value = value;
      return await this.customFieldValueRepository.save(existing);
    }

    try {
      return await this.customFieldValueRepository.save(
        this.customFieldValueRepository.create({
          entityId,
          customField,
          value,
        }),
      );
    } catch (err) {
      // 23505 = unique violation: a concurrent request created the row first. Update that row instead.
      const raced =
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string })?.code === '23505'
          ? await findExisting()
          : null;
      if (!raced) throw err;
      raced.value = value;
      return await this.customFieldValueRepository.save(raced);
    }
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
