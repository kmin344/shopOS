import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomFieldValue } from '../entities/custom-field-value.entity';
import { CustomField, EntityType } from '../entities/custom-field.entity';
import { CustomFieldService } from './custom-field.service';
import { In } from 'typeorm';

@Injectable()
export class CustomFieldValueService {
  constructor(
    @InjectRepository(CustomFieldValue)
    private customFieldValueRepository: Repository<CustomFieldValue>,
    private customFieldService: CustomFieldService,
  ) {}

  async setFieldValue(
    entityId: string,
    customFieldId: string,
    value: string,
  ): Promise<CustomFieldValue> {
    const customField = await this.customFieldService.findOne(customFieldId);

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
    const customFields = await this.customFieldService.findByEntityType(
      entityType,
    );

    return await this.customFieldValueRepository.find({
      where: {
        entityId,
        customField: { id: In(customFields.map((cf) => cf.id)) },
      },
      relations: ['customField'],
    });
  }
}
