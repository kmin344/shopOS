import { BadRequestException } from '@nestjs/common';
import { FieldType } from './entities/custom-field.entity';
import { validateFieldDefinition, validateFieldValue } from './validate-value';

const field = (
  fieldType: FieldType,
  extra: Partial<{ enumValues: string[]; isRequired: boolean }> = {},
) => ({ name: 'F', fieldType, isRequired: false, ...extra });

describe('validateFieldValue', () => {
  it.each([
    [FieldType.STRING, 'anything at all'],
    [FieldType.NUMBER, '12'],
    [FieldType.NUMBER, '-3.5'],
    [FieldType.BOOLEAN, 'true'],
    [FieldType.BOOLEAN, 'false'],
    [FieldType.DATE, '2026-11-16'],
    [FieldType.DATE, '2026-11-16T10:30:00Z'],
  ])('accepts a valid %s value %p', (type, value) => {
    expect(() => validateFieldValue(field(type), value)).not.toThrow();
  });

  it.each([
    [FieldType.NUMBER, 'abc'],
    [FieldType.NUMBER, '1e5'],
    [FieldType.NUMBER, '1,5'],
    [FieldType.BOOLEAN, 'yes'],
    [FieldType.BOOLEAN, 'TRUE'],
    [FieldType.DATE, 'tomorrow'],
    [FieldType.DATE, '2026-13-45'],
  ])('rejects an invalid %s value %p', (type, value) => {
    expect(() => validateFieldValue(field(type), value)).toThrow(
      BadRequestException,
    );
  });

  it('accepts only declared ENUM options', () => {
    const f = field(FieldType.ENUM, { enumValues: ['S', 'M', 'L'] });
    expect(() => validateFieldValue(f, 'M')).not.toThrow();
    expect(() => validateFieldValue(f, 'XL')).toThrow(/one of: S, M, L/);
  });

  it('requires a value on a required field but not on an optional one', () => {
    expect(() =>
      validateFieldValue(field(FieldType.STRING, { isRequired: true }), '  '),
    ).toThrow(/required/);
    expect(() => validateFieldValue(field(FieldType.NUMBER), '')).not.toThrow();
  });
});

describe('validateFieldDefinition', () => {
  it('rejects an ENUM field with no options', () => {
    expect(() => validateFieldDefinition(field(FieldType.ENUM))).toThrow(
      /at least one value/,
    );
  });

  it('rejects ENUM options that contain a comma', () => {
    expect(() =>
      validateFieldDefinition(field(FieldType.ENUM, { enumValues: ['a,b'] })),
    ).toThrow(/commas/);
  });

  it('rejects a default value that does not match the type', () => {
    expect(() =>
      validateFieldDefinition({
        ...field(FieldType.NUMBER),
        defaultValue: 'x',
      }),
    ).toThrow(BadRequestException);
  });

  it('accepts a valid ENUM definition with a valid default', () => {
    expect(() =>
      validateFieldDefinition({
        ...field(FieldType.ENUM, { enumValues: ['S', 'M'] }),
        defaultValue: 'S',
      }),
    ).not.toThrow();
  });
});
