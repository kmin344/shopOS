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

  const orderFields = `id status totalAmount items { quantity unitPrice product { id name stock } }`;

  const createOrder = (lines: Array<string | [string, number]>) =>
    gql(
      `mutation ($input: CreateOrderInput!) {
        createOrder(input: $input) { ${orderFields} }
      }`,
      {
        input: {
          items: lines.map((l) =>
            typeof l === 'string'
              ? { productId: l, quantity: 1 }
              : { productId: l[0], quantity: l[1] },
          ),
        },
      },
    ).then((d) => d.createOrder);

  const stockOf = (productId: string) =>
    gql(`query ($id: ID!) { product(id: $id) { stock } }`, {
      id: productId,
    }).then((d) => d.product.stock as number);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    const dataSource = app.get(DataSource);
    expect(dataSource.options.database).toMatch(/_test$/);
    // Build the schema from the migrations, so the suite also proves they match the entities.
    await dataSource.dropDatabase();
    await dataSource.runMigrations();
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
    expect(order.items).toHaveLength(2);
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
        {
          input: {
            items: [
              { productId: id, quantity: 1 },
              { productId: id, quantity: 2 },
            ],
          },
        },
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

  describe('order lines and stock', () => {
    it('multiplies by quantity, snapshots the unit price and takes stock', async () => {
      const categoryId = await createCategory('Quantities');
      const pen = await createProduct(categoryId, 'Pen', 1.1); // stock 5
      const pad = await createProduct(categoryId, 'Pad', 2.5);

      const order = await createOrder([
        [pen, 3],
        [pad, 2],
      ]);
      expect(order.totalAmount).toBe(8.3); // 3 x 1.10 + 2 x 2.50
      expect(order.items.map((i) => i.quantity).sort()).toEqual([2, 3]);
      expect(await stockOf(pen)).toBe(2);
      expect(await stockOf(pad)).toBe(3);

      // A later price change does not alter the placed order.
      await gql(
        `mutation ($input: UpdateProductInput!) { updateProduct(input: $input) { id } }`,
        { input: { id: pen, price: 9.99 } },
      );
      const { order: again } = await gql(
        `query ($id: ID!) { order(id: $id) { totalAmount items { unitPrice product { name } } } }`,
        { id: order.id },
      );
      expect(again.totalAmount).toBe(8.3);
      expect(again.items.find((i) => i.product.name === 'Pen').unitPrice).toBe(
        1.1,
      );
    });

    it('refuses an order that needs more stock than exists and changes nothing', async () => {
      const categoryId = await createCategory('Oversell');
      const ok = await createProduct(categoryId, 'Plenty', 1); // stock 5
      const low = await createProduct(categoryId, 'Scarce', 1);

      const error = await errorOf(
        `mutation ($input: CreateOrderInput!) { createOrder(input: $input) { id } }`,
        {
          input: {
            items: [
              { productId: ok, quantity: 1 },
              { productId: low, quantity: 6 },
            ],
          },
        },
      );
      expect(error.message).toMatch(/Not enough stock for "Scarce"/);
      expect(await stockOf(ok)).toBe(5); // rolled back
      expect(await stockOf(low)).toBe(5);
    });

    it('does not oversell when two orders race for the last units', async () => {
      const categoryId = await createCategory('Race');
      const id = await createProduct(categoryId, 'Last', 1); // stock 5
      const place = () =>
        graphql(
          `
            mutation ($input: CreateOrderInput!) {
              createOrder(input: $input) {
                id
              }
            }
          `,
          { input: { items: [{ productId: id, quantity: 3 }] } },
        );
      const results = await Promise.all([place(), place()]);
      expect(results.filter((r) => !r.errors)).toHaveLength(1);
      expect(await stockOf(id)).toBe(2);
    });

    it('rejects a zero or negative quantity', async () => {
      const categoryId = await createCategory('BadQty');
      const id = await createProduct(categoryId, 'Thing', 1);
      for (const quantity of [0, -1]) {
        const error = await errorOf(
          `mutation ($input: CreateOrderInput!) { createOrder(input: $input) { id } }`,
          { input: { items: [{ productId: id, quantity }] } },
        );
        expect(error.extensions.originalError.message.join(' ')).toMatch(
          /quantity/,
        );
      }
    });

    it('returns the stock when an order is cancelled, once, and blocks reopening', async () => {
      const categoryId = await createCategory('Cancel');
      const id = await createProduct(categoryId, 'Mug', 4);
      const order = await createOrder([[id, 4]]);
      expect(await stockOf(id)).toBe(1);

      const setStatus = `mutation ($input: UpdateOrderInput!) { updateOrder(input: $input) { status } }`;
      const cancel = await gql(setStatus, {
        input: { id: order.id, status: 'CANCELLED' },
      });
      expect(cancel.updateOrder.status).toBe('CANCELLED');
      expect(await stockOf(id)).toBe(5);

      await gql(setStatus, { input: { id: order.id, status: 'CANCELLED' } });
      expect(await stockOf(id)).toBe(5); // not returned twice

      const error = await errorOf(setStatus, {
        input: { id: order.id, status: 'PROCESSING' },
      });
      expect(error.message).toMatch(/cannot be reopened/);
    });

    it('does not allow cancelling a shipped order', async () => {
      const categoryId = await createCategory('Shipped');
      const id = await createProduct(categoryId, 'Lamp', 4);
      const order = await createOrder([[id, 1]]);
      const setStatus = `mutation ($input: UpdateOrderInput!) { updateOrder(input: $input) { status } }`;
      await gql(setStatus, { input: { id: order.id, status: 'SHIPPED' } });
      const error = await errorOf(setStatus, {
        input: { id: order.id, status: 'CANCELLED' },
      });
      expect(error.message).toMatch(/SHIPPED order cannot be cancelled/);
      expect(await stockOf(id)).toBe(4);
    });

    it('refuses to delete a product that appears in an order, with 409', async () => {
      const categoryId = await createCategory('Referenced');
      const id = await createProduct(categoryId, 'Anchor', 1);
      await createOrder([id]);
      await request(app.getHttpServer()).delete(`/products/${id}`).expect(409);
    });

    it('keeps one value when two requests set the same custom field at once', async () => {
      const categoryId = await createCategory('ConcurrentValues');
      const productId = await createProduct(categoryId, 'Desk', 10);
      const { createCustomField } = await gql(
        `mutation { createCustomField(input: { name: "Finish", fieldType: STRING, entityType: PRODUCT, isRequired: false }) { id } }`,
      );
      const set = (value: string) =>
        graphql(
          `
            mutation ($e: ID!, $f: ID!, $v: String!) {
              setCustomFieldValue(entityId: $e, customFieldId: $f, value: $v) {
                id
              }
            }
          `,
          { e: productId, f: createCustomField.id, v: value },
        );
      const results = await Promise.all([
        set('matte'),
        set('gloss'),
        set('satin'),
      ]);
      expect(results.every((r) => !r.errors)).toBe(true);
      const { product } = await gql(
        `query ($id: ID!) { product(id: $id) { customFieldValues { value customField { name } } } }`,
        { id: productId },
      );
      expect(
        product.customFieldValues.filter(
          (v) => v.customField.name === 'Finish',
        ),
      ).toHaveLength(1);
    });
  });
});
