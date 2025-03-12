import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomField, EntityType } from '../entities/custom-field.entity';
import { CreateCustomFieldInput } from '../dto/create-custom-field.input';
import { UpdateCustomFieldInput } from '../dto/update-custom-field.input';

@Injectable()
export class CustomFieldService {
  constructor(
    @InjectRepository(CustomField)
    private customFieldRepository: Repository<CustomField>,
  ) {}

  async create(
    createCustomFieldInput: CreateCustomFieldInput,
  ): Promise<CustomField> {
    const customField = this.customFieldRepository.create(
      createCustomFieldInput,
    );
    return await this.customFieldRepository.save(customField);
  }

  async findAll(): Promise<CustomField[]> {
    return await this.customFieldRepository.find();
  }

  async findByEntityType(entityType: EntityType): Promise<CustomField[]> {
    return await this.customFieldRepository.find({
      where: { entityType },
    });
  }

  async findOne(id: string): Promise<CustomField> {
    const customField = await this.customFieldRepository.findOne({
      where: { id },
    });

    if (!customField) {
      throw new NotFoundException(`Custom field with ID ${id} not found`);
    }

    return customField;
  }

  async update(
    id: string,
    updateCustomFieldInput: UpdateCustomFieldInput,
  ): Promise<CustomField> {
    const customField = await this.findOne(id);

    Object.assign(customField, updateCustomFieldInput);
    return await this.customFieldRepository.save(customField);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.customFieldRepository.delete(id);
    return result.affected > 0;
  }
}
