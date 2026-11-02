import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';

// Runs the full GraphQL flow against a real Postgres database.
// Configure the connection with the same DB_* variables the app uses.
describe('ShopOS GraphQL (e2e)', () => {
  let app: INestApplication;

  const gql = async (
    query: string,
    variables: Record<string, unknown> = {},
  ) => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query, variables })
      .expect(200);
    if (res.body.errors) {
      throw new Error(JSON.stringify(res.body.errors, null, 2));
    }
    return res.body.data;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    await app.get(DataSource).synchronize(true);
  });

  afterAll(async () => {
    await app.close();
  });

  it('attaches a runtime custom field to a product and serves it through GraphQL', async () => {
    const { createCategory } = await gql(
      `mutation ($input: CreateCategoryInput!) {
        createCategory(input: $input) { id name }
      }`,
      { input: { name: 'Laptops' } },
    );

    const { createProduct } = await gql(
      `mutation ($input: CreateProductInput!) {
        createProduct(input: $input) { id name category { id } }
      }`,
      {
        input: {
          name: 'Gaming Laptop',
          price: 1299.99,
          stock: 10,
          categoryId: createCategory.id,
        },
      },
    );
    expect(createProduct.category.id).toBe(createCategory.id);

    const { createCustomField } = await gql(
      `mutation ($input: CreateCustomFieldInput!) {
        createCustomField(input: $input) { id name fieldType entityType }
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
      {
        entityId: createProduct.id,
        fieldId: createCustomField.id,
        value: 'black',
      },
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
      { id: createProduct.id },
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

  it('computes the order total from product prices', async () => {
    const { categories } = await gql(`query { categories { id } }`);
    const create = (name: string, price: number) =>
      gql(
        `mutation ($input: CreateProductInput!) {
          createProduct(input: $input) { id }
        }`,
        { input: { name, price, stock: 5, categoryId: categories[0].id } },
      ).then((d) => d.createProduct.id);

    const ids = [await create('Mouse', 19.99), await create('Keyboard', 49.5)];

    const { createOrder } = await gql(
      `mutation ($input: CreateOrderInput!) {
        createOrder(input: $input) { totalAmount status products { name } }
      }`,
      { input: { productIds: ids } },
    );

    expect(createOrder.totalAmount).toBeCloseTo(69.49, 2);
    expect(createOrder.products).toHaveLength(2);
  });

  it('returns no custom field values for an entity type with no fields defined', async () => {
    const { categories } = await gql(
      `query { categories { name customFieldValues { value } } }`,
    );
    expect(categories[0].customFieldValues).toEqual([]);
  });
});
