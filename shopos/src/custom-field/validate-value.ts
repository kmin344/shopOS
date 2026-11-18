import { BadRequestException } from '@nestjs/common';
import { CustomField, FieldType } from './entities/custom-field.entity';

const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;
const DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;

/**
 * Checks a custom field value against the field's declared type.
 * Values are stored as text, so the rules decide which text is acceptable.
 * Throws BadRequestException with a message that names the field.
 */
export function validateFieldValue(
  field: Pick<CustomField, 'name' | 'fieldType' | 'enumValues' | 'isRequired'>,
  value: string,
): void {
  const fail = (reason: string): never => {
    throw new BadRequestException(`Custom field "${field.name}": ${reason}`);
  };

  if (value.trim() === '') {
    if (field.isRequired) fail('a value is required');
    return; // an optional field may be set to an empty value
  }

  switch (field.fieldType) {
    case FieldType.STRING:
      return;
    case FieldType.NUMBER:
      if (!NUMBER_PATTERN.test(value) || !Number.isFinite(Number(value))) {
        fail('value must be a number, for example 12 or -3.5');
      }
      return;
    case FieldType.BOOLEAN:
      if (value !== 'true' && value !== 'false') {
        fail('value must be "true" or "false"');
      }
      return;
    case FieldType.DATE:
      if (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
        fail('value must be an ISO date, for example 2026-11-16');
      }
      return;
    case FieldType.ENUM:
      if (!field.enumValues?.includes(value)) {
        fail(`value must be one of: ${(field.enumValues ?? []).join(', ')}`);
      }
      return;
  }
}

/** Checks a field definition. An ENUM field needs options, and a default must be a valid value. */
export function validateFieldDefinition(
  field: Pick<
    CustomField,
    'name' | 'fieldType' | 'enumValues' | 'defaultValue' | 'isRequired'
  >,
): void {
  if (field.fieldType === FieldType.ENUM) {
    if (!field.enumValues || field.enumValues.length === 0) {
      throw new BadRequestException(
        `Custom field "${field.name}": an ENUM field needs at least one value in enumValues`,
      );
    }
    if (field.enumValues.some((v) => v.includes(',') || v.trim() === '')) {
      // enumValues is stored as a comma-separated list, so a comma would split one option in two.
      throw new BadRequestException(
        `Custom field "${field.name}": enumValues must not be empty or contain commas`,
      );
    }
  }
  if (field.defaultValue !== undefined && field.defaultValue !== null) {
    validateFieldValue({ ...field, isRequired: false }, field.defaultValue);
  }
}
