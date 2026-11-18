import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
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

const PRODUCT_ID = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b';

describe('CustomFieldValueService', () => {
  let service: CustomFieldValueService;
  let repo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let fields: { findOne: jest.Mock; findByEntityType: jest.Mock };
  let entityExists: jest.Mock;
  let getRepository: jest.Mock;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((v) => ({ ...v })),
      save: jest.fn(async (v) => ({ id: 'value-1', ...v })),
    };
    fields = { findOne: jest.fn(), findByEntityType: jest.fn() };
    entityExists = jest.fn().mockResolvedValue(true);
    getRepository = jest.fn(() => ({ exists: entityExists }));

    const moduleRef = await Test.createTestingModule({
      providers: [
        CustomFieldValueService,
        { provide: getRepositoryToken(CustomFieldValue), useValue: repo },
        { provide: CustomFieldService, useValue: fields },
        { provide: DataSource, useValue: { getRepository } },
      ],
    }).compile();

    service = moduleRef.get(CustomFieldValueService);
  });

  describe('setFieldValue', () => {
    it('creates a new value when the entity has none for that field', async () => {
      fields.findOne.mockResolvedValue(colorField);
      repo.findOne.mockResolvedValue(null);

      const result = await service.setFieldValue(
        PRODUCT_ID,
        colorField.id,
        'red',
      );

      expect(repo.create).toHaveBeenCalledWith({
        entityId: PRODUCT_ID,
        customField: colorField,
        value: 'red',
      });
      expect(result).toMatchObject({ entityId: PRODUCT_ID, value: 'red' });
    });

    it('updates the existing value instead of inserting a duplicate', async () => {
      const existing = {
        id: 'value-1',
        entityId: PRODUCT_ID,
        customField: colorField,
        value: 'red',
      };
      fields.findOne.mockResolvedValue(colorField);
      repo.findOne.mockResolvedValue(existing);

      const result = await service.setFieldValue(
        PRODUCT_ID,
        colorField.id,
        'blue',
      );

      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalledWith({ ...existing, value: 'blue' });
      expect(result.value).toBe('blue');
    });

    it('checks the entity exists in the table for the field type', async () => {
      fields.findOne.mockResolvedValue(colorField);
      repo.findOne.mockResolvedValue(null);

      await service.setFieldValue(PRODUCT_ID, colorField.id, 'red');

      expect(getRepository).toHaveBeenCalledWith('Product');
      expect(entityExists).toHaveBeenCalledWith({ where: { id: PRODUCT_ID } });
    });

    it('rejects values for an entity that does not exist', async () => {
      fields.findOne.mockResolvedValue(colorField);
      entityExists.mockResolvedValue(false);

      await expect(
        service.setFieldValue(PRODUCT_ID, colorField.id, 'red'),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.setFieldValue('ghost', colorField.id, 'red'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rejects values for a custom field that does not exist', async () => {
      fields.findOne.mockRejectedValue(new NotFoundException());

      await expect(
        service.setFieldValue(PRODUCT_ID, 'missing', 'red'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('getFieldValues', () => {
    it('only looks up values for fields defined on the entity type', async () => {
      fields.findByEntityType.mockResolvedValue([colorField]);
      repo.find.mockResolvedValue([]);

      await service.getFieldValues(PRODUCT_ID, EntityType.PRODUCT);

      expect(fields.findByEntityType).toHaveBeenCalledWith(EntityType.PRODUCT);
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            entityId: PRODUCT_ID,
            customField: { id: In([colorField.id]) },
          },
        }),
      );
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
