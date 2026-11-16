import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CustomFieldDefinition,
  generateFieldTypes,
  parseFieldValue,
  toFieldObject,
} from '../src';

test('parseFieldValue converts text to the declared type', () => {
  assert.equal(parseFieldValue('NUMBER', '-3.5'), -3.5);
  assert.equal(parseFieldValue('BOOLEAN', 'true'), true);
  assert.equal(parseFieldValue('BOOLEAN', 'false'), false);
  assert.equal(parseFieldValue('DATE', '2026-11-16'), '2026-11-16');
  assert.equal(parseFieldValue('ENUM', 'M'), 'M');
  assert.equal(parseFieldValue('STRING', 'oak'), 'oak');
});

test('parseFieldValue drops empty or mismatched values', () => {
  assert.equal(parseFieldValue('STRING', ''), undefined);
  assert.equal(parseFieldValue('NUMBER', 'abc'), undefined);
  assert.equal(parseFieldValue('BOOLEAN', 'yes'), undefined);
});

test('toFieldObject keys values by field name', () => {
  assert.deepEqual(
    toFieldObject([
      { value: '12', customField: { name: 'Weight', fieldType: 'NUMBER' } },
      { value: 'true', customField: { name: 'Fragile', fieldType: 'BOOLEAN' } },
      { value: '', customField: { name: 'Empty', fieldType: 'STRING' } },
    ]),
    { Weight: 12, Fragile: true },
  );
  assert.deepEqual(toFieldObject(null), {});
});

const def = (d: Partial<CustomFieldDefinition>): CustomFieldDefinition => ({
  id: 'x',
  name: 'F',
  fieldType: 'STRING',
  entityType: 'PRODUCT',
  isRequired: false,
  ...d,
});

test('generateFieldTypes writes one optional property per field, with ENUM unions', () => {
  const out = generateFieldTypes(
    [
      def({ name: 'Size', fieldType: 'ENUM', enumValues: ['S', 'M'] }),
      def({ name: 'Weight', fieldType: 'NUMBER', description: 'In grams' }),
      def({ name: 'Gift message', entityType: 'ORDER' }),
    ],
    'http://shop.test/graphql',
  );
  assert.match(out, /"Size"\?: "S" \| "M";/);
  assert.match(out, /\/\*\* In grams \*\/\n {4}"Weight"\?: number;/);
  assert.match(out, /ORDER: \{\n {4}"Gift message"\?: string;/);
  assert.match(out, /CATEGORY: \{\n {2}\};/);
});

test('generateFieldTypes escapes names, options and comments safely', () => {
  const out = generateFieldTypes(
    [
      def({
        name: 'He said "hi"',
        fieldType: 'ENUM',
        enumValues: ['a"b'],
        description: 'ends */ here',
      }),
    ],
    'http://evil\n/* injected',
  );
  assert.match(out, /"He said \\"hi\\""\?: "a\\"b";/);
  assert.doesNotMatch(out, /ends \*\/ here/);
  assert.equal(out.split('\n')[0].includes('injected'), true); // stays on the comment line
});
