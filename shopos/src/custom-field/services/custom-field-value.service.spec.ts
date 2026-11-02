import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CustomFieldValueService } from './custom-field-value.service';
import { CustomFieldService } from './custom-field.service';
import { CustomFieldValue } from '../entities/custom-field-value.entity';
import {
  CustomField,
  EntityType,
  FieldType,
} from '../entities/custom-field.entity';

const colorField = {
  id: 'field-color',
  name: 'Color',
  fieldType: FieldType.STRING,
  entityType: EntityType.PRODUCT,
  isRequired: false,
} as CustomField;

describe('CustomFieldValueService', () => {
  let service: CustomFieldValueService;
  let repo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let fields: { findOne: jest.Mock; findByEntityType: jest.Mock };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((v) => ({ ...v })),
      save: jest.fn(async (v) => ({ id: 'value-1', ...v })),
    };
    fields = { findOne: jest.fn(), findByEntityType: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CustomFieldValueService,
        { provide: getRepositoryToken(CustomFieldValue), useValue: repo },
        { provide: CustomFieldService, useValue: fields },
      ],
    }).compile();

    service = moduleRef.get(CustomFieldValueService);
  });

  describe('setFieldValue', () => {
    it('creates a new value when the entity has none for that field', async () => {
      fields.findOne.mockResolvedValue(colorField);
      repo.findOne.mockResolvedValue(null);

      const result = await service.setFieldValue(
        'product-1',
        colorField.id,
        'red',
      );

      expect(repo.create).toHaveBeenCalledWith({
        entityId: 'product-1',
        customField: colorField,
        value: 'red',
      });
      expect(result).toMatchObject({ entityId: 'product-1', value: 'red' });
    });

    it('updates the existing value instead of inserting a duplicate', async () => {
      const existing = {
        id: 'value-1',
        entityId: 'product-1',
        customField: colorField,
        value: 'red',
      };
      fields.findOne.mockResolvedValue(colorField);
      repo.findOne.mockResolvedValue(existing);

      const result = await service.setFieldValue(
        'product-1',
        colorField.id,
        'blue',
      );

      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalledWith({ ...existing, value: 'blue' });
      expect(result.value).toBe('blue');
    });

    it('rejects values for a custom field that does not exist', async () => {
      fields.findOne.mockRejectedValue(new NotFoundException());

      await expect(
        service.setFieldValue('product-1', 'missing', 'red'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('getFieldValues', () => {
    it('only looks up values for fields defined on the entity type', async () => {
      fields.findByEntityType.mockResolvedValue([colorField]);
      repo.find.mockResolvedValue([]);

      await service.getFieldValues('product-1', EntityType.PRODUCT);

      expect(fields.findByEntityType).toHaveBeenCalledWith(EntityType.PRODUCT);
      const where = repo.find.mock.calls[0][0].where;
      expect(where.entityId).toBe('product-1');
      expect(where.customField.id.value).toEqual([colorField.id]);
    });

    it('returns an empty list without querying when no fields are defined', async () => {
      fields.findByEntityType.mockResolvedValue([]);

      await expect(
        service.getFieldValues('order-1', EntityType.ORDER),
      ).resolves.toEqual([]);
      expect(repo.find).not.toHaveBeenCalled();
    });
  });
});
