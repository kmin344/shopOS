import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';

// Runs the full GraphQL and REST flow against a real Postgres database.
// test/setup-env.js points the app at a dedicated *_test database.
describe('ShopOS API (e2e)', () => {
  let app: INestApplication;

  const graphql = (query: string, variables: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/graphql')
      .send({ query, variables })
      .expect(200)
      .then((res) => res.body);

  const gql = async (
    query: string,
    variables: Record<string, unknown> = {},
  ) => {
    const body = await graphql(query, variables);
    if (body.errors) {
      throw new Error(JSON.stringify(body.errors, null, 2));
    }
    return body.data;
  };

  const errorOf = async (query: string, variables: Record<string, unknown>) => {
    const body = await graphql(query, variables);
    expect(body.errors).toBeDefined();
    return body.errors[0];
  };

  const createCategory = (name: string) =>
    gql(
      `mutation ($input: CreateCategoryInput!) { createCategory(input: $input) { id } }`,
      { input: { name } },
    ).then((d) => d.createCategory.id as string);

  const createProduct = (categoryId: string, name: string, price: number) =>
    gql(
      `mutation ($input: CreateProductInput!) { createProduct(input: $input) { id } }`,
      { input: { name, price, stock: 5, categoryId } },
    ).then((d) => d.createProduct.id as string);

  const createOrder = (productIds: string[]) =>
    gql(
      `mutation ($input: CreateOrderInput!) {
        createOrder(input: $input) { id totalAmount products { name } }
      }`,
      { input: { productIds } },
    ).then((d) => d.createOrder);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    const dataSource = app.get(DataSource);
    expect(dataSource.options.database).toMatch(/_test$/);
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    await app.close();
  });

  it('attaches a runtime custom field to a product and serves it through GraphQL', async () => {
    const categoryId = await createCategory('Laptops');
    const productId = await createProduct(categoryId, 'Gaming Laptop', 1299.99);

    const { createCustomField } = await gql(
      `mutation ($input: CreateCustomFieldInput!) {
        createCustomField(input: $input) { id }
      }`,
      {
        input: {
          name: 'Color',
          fieldType: 'STRING',
          entityType: 'PRODUCT',
          isRequired: false,
        },
      },
    );

    await gql(
      `mutation ($entityId: ID!, $fieldId: ID!, $value: String!) {
        setCustomFieldValue(entityId: $entityId, customFieldId: $fieldId, value: $value) { id }
      }`,
      { entityId: productId, fieldId: createCustomField.id, value: 'black' },
    );

    const { product } = await gql(
      `query ($id: ID!) {
        product(id: $id) {
          name
          price
          category { name }
          customFieldValues { value customField { name fieldType } }
        }
      }`,
      { id: productId },
    );

    expect(product).toEqual({
      name: 'Gaming Laptop',
      price: 1299.99,
      category: { name: 'Laptops' },
      customFieldValues: [
        { value: 'black', customField: { name: 'Color', fieldType: 'STRING' } },
      ],
    });
  });

  it('computes exact order totals without floating-point drift', async () => {
    const categoryId = await createCategory('Accessories');
    const a = await createProduct(categoryId, 'Sticker', 0.1);
    const b = await createProduct(categoryId, 'Pin', 0.2);
    const c = await createProduct(categoryId, 'Keyboard', 49.5);
    const d = await createProduct(categoryId, 'Mouse', 19.99);

    expect((await createOrder([a, b])).totalAmount).toBe(0.3);

    const order = await createOrder([c, d]);
    expect(order.totalAmount).toBe(69.49);
    expect(order.products).toHaveLength(2);
  });

  it('returns no custom field values for an entity type with no fields defined', async () => {
    const categoryId = await createCategory('Empty');
    const { category } = await gql(
      `query ($id: ID!) { category(id: $id) { customFieldValues { value } } }`,
      { id: categoryId },
    );
    expect(category.customFieldValues).toEqual([]);
  });

  describe('invalid input', () => {
    it('rejects a product whose category does not exist', async () => {
      const error = await errorOf(
        `mutation ($input: CreateProductInput!) { createProduct(input: $input) { id } }`,
        {
          input: {
            name: 'Orphan',
            price: 1,
            stock: 1,
            categoryId: '00000000-0000-4000-8000-000000000000',
          },
        },
      );
      expect(error.message).toMatch(/Category .* not found/);
    });

    it('rejects a malformed category ID and a price with more than two decimals', async () => {
      const error = await errorOf(
        `mutation ($input: CreateProductInput!) { createProduct(input: $input) { id } }`,
        {
          input: {
            name: 'Bad',
            price: 1.005,
            stock: 1,
            categoryId: 'not-a-uuid',
          },
        },
      );
      const messages = error.extensions.originalError.message.join(' ');
      expect(messages).toMatch(/categoryId must be a UUID/);
      expect(messages).toMatch(/price/);
    });

    it('rejects an order that lists the same product twice', async () => {
      const categoryId = await createCategory('Dupes');
      const id = await createProduct(categoryId, 'Cable', 5);
      const error = await errorOf(
        `mutation ($input: CreateOrderInput!) { createOrder(input: $input) { id } }`,
        { input: { productIds: [id, id] } },
      );
      expect(error.extensions.originalError.message.join(' ')).toMatch(
        /unique/,
      );
    });

    it('rejects a price that does not fit the price column', async () => {
      const categoryId = await createCategory('Luxury');
      const error = await errorOf(
        `mutation ($input: CreateProductInput!) { createProduct(input: $input) { id } }`,
        { input: { name: 'Yacht', price: 100000000, stock: 1, categoryId } },
      );
      expect(error.extensions.originalError.message.join(' ')).toMatch(
        /price must not be greater than/,
      );
    });

    it('refuses to delete a category that still has products, with 409 over REST', async () => {
      const categoryId = await createCategory('In use');
      await createProduct(categoryId, 'Lamp', 30);

      await request(app.getHttpServer())
        .delete(`/categories/${categoryId}`)
        .expect(409);

      const error = await errorOf(
        `mutation ($id: ID!) { removeCategory(id: $id) }`,
        {
          id: categoryId,
        },
      );
      expect(error.message).toMatch(/still has 1 product/);
    });

    it('returns 404 when deleting something that does not exist or has a malformed ID', async () => {
      await request(app.getHttpServer()).delete('/categories/abc').expect(404);
      await request(app.getHttpServer())
        .delete('/products/00000000-0000-4000-8000-000000000000')
        .expect(404);
    });

    it('rejects custom field values for entities that do not exist', async () => {
      const { createCustomField } = await gql(
        `mutation ($input: CreateCustomFieldInput!) { createCustomField(input: $input) { id } }`,
        {
          input: {
            name: 'Material',
            fieldType: 'STRING',
            entityType: 'PRODUCT',
            isRequired: false,
          },
        },
      );
      const setValue = `mutation ($entityId: ID!, $fieldId: ID!) {
        setCustomFieldValue(entityId: $entityId, customFieldId: $fieldId, value: "oak") { id }
      }`;

      expect(
        (
          await errorOf(setValue, {
            entityId: 'ghost',
            fieldId: createCustomField.id,
          })
        ).message,
      ).toMatch(/Product ghost not found/);
      expect(
        (
          await errorOf(setValue, {
            entityId: '00000000-0000-4000-8000-000000000000',
            fieldId: 'abc',
          })
        ).message,
      ).toMatch(/Custom field .* not found/);
    });

    it('returns a not-found error for a missing product over GraphQL and REST', async () => {
      const error = await errorOf(
        `query ($id: ID!) { product(id: $id) { id } }`,
        {
          id: '00000000-0000-4000-8000-000000000000',
        },
      );
      expect(error.message).toMatch(/not found/);

      await request(app.getHttpServer())
        .get('/products/does-not-exist')
        .expect(404);
    });

    it('rejects custom field values that do not match the field type', async () => {
      const categoryId = await createCategory('Validation');
      const productId = await createProduct(categoryId, 'Chair', 10);
      const defineField = (input: Record<string, unknown>) =>
        gql(
          `mutation ($input: CreateCustomFieldInput!) { createCustomField(input: $input) { id } }`,
          { input },
        ).then((d) => d.createCustomField.id as string);
      const setValue = `mutation ($entityId: ID!, $fieldId: ID!, $value: String!) {
        setCustomFieldValue(entityId: $entityId, customFieldId: $fieldId, value: $value) { value }
      }`;

      const weightId = await defineField({
        name: 'Weight',
        fieldType: 'NUMBER',
        entityType: 'PRODUCT',
        isRequired: false,
      });
      const sizeId = await defineField({
        name: 'Size',
        fieldType: 'ENUM',
        enumValues: ['S', 'M', 'L'],
        entityType: 'PRODUCT',
        isRequired: false,
      });

      expect(
        (
          await errorOf(setValue, {
            entityId: productId,
            fieldId: weightId,
            value: 'heavy',
          })
        ).message,
      ).toMatch(/must be a number/);
      expect(
        (
          await errorOf(setValue, {
            entityId: productId,
            fieldId: sizeId,
            value: 'XL',
          })
        ).message,
      ).toMatch(/one of: S, M, L/);

      const ok = await gql(setValue, {
        entityId: productId,
        fieldId: sizeId,
        value: 'M',
      });
      expect(ok.setCustomFieldValue.value).toBe('M');

      expect(
        (
          await errorOf(
            `mutation { createCustomField(input: { name: "Bad", fieldType: ENUM, entityType: PRODUCT, isRequired: false }) { id } }`,
            {},
          )
        ).message,
      ).toMatch(/at least one value/);
    });
  });
});
