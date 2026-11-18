import {
  CustomFieldDefinition,
  EntityType,
  RawFieldValue,
  StoreFields,
  toFieldObject,
} from './fields';

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';

export interface Category<F = StoreFields['CATEGORY']> {
  id: string;
  name: string;
  description: string | null;
  fields: Partial<F>;
}

export interface Product<F = StoreFields['PRODUCT']> {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category: { id: string; name: string };
  fields: Partial<F>;
}

export interface OrderItem {
  quantity: number;
  unitPrice: number;
  product: { id: string; name: string };
}

export interface Order<F = StoreFields['ORDER']> {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
  fields: Partial<F>;
}

export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
}

export interface PaymentSession {
  payment: Payment;
  /** Pass to the provider's client library, for example Stripe's confirmPayment. */
  clientSecret: string | null;
}

export interface ShopClientOptions {
  /** The GraphQL endpoint, for example https://shop.example.com/graphql */
  url: string;
  /** Only for server-side admin use. Never ship an admin key to a browser. */
  adminKey?: string;
  /** Defaults to the global fetch. */
  fetch?: typeof fetch;
  headers?: Record<string, string>;
}

/** The API answered with GraphQL errors, or with a non-JSON response. */
export class ShopApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: unknown[] = [],
  ) {
    super(message);
    this.name = 'ShopApiError';
  }
}

const FIELD_VALUES = 'customFieldValues { value customField { name fieldType } }';
const CATEGORY = `id name description ${FIELD_VALUES}`;
const PRODUCT = `id name description price stock category { id name } ${FIELD_VALUES}`;
const ORDER = `id status totalAmount createdAt items { quantity unitPrice product { id name } } ${FIELD_VALUES}`;
const PAYMENT = 'id orderId provider status amount currency';

type WithRaw<T> = Omit<T, 'fields'> & { customFieldValues: RawFieldValue[] | null };

function withFields<T extends { fields: unknown }>(raw: WithRaw<T>): T {
  const { customFieldValues, ...rest } = raw;
  return { ...rest, fields: toFieldObject(customFieldValues) } as unknown as T;
}

/**
 * Creates a client. Pass your generated ShopFields type to get typed custom fields:
 *   const shop = createShopClient<ShopFields>({ url });
 *   (await shop.product(id)).fields.Color // string | undefined
 */
export function createShopClient<F extends StoreFields = StoreFields>(
  options: ShopClientOptions,
) {
  const http = options.fetch ?? globalThis.fetch;
  if (!http) throw new Error('No fetch available; pass options.fetch');

  async function query<T>(document: string, variables: Record<string, unknown> = {}): Promise<T> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...options.headers,
    };
    if (options.adminKey) headers.authorization = `Bearer ${options.adminKey}`;
    const res = await http(options.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: document, variables }),
    });
    const body = (await res.json().catch(() => null)) as {
      data?: T;
      errors?: { message: string }[];
    } | null;
    if (!body) throw new ShopApiError(`ShopOS returned ${res.status} without JSON`, res.status);
    if (body.errors?.length) {
      throw new ShopApiError(body.errors[0].message, res.status, body.errors);
    }
    if (!body.data) throw new ShopApiError('ShopOS returned no data', res.status);
    return body.data;
  }

  return {
    /** Runs any GraphQL document. Use it for operations the client does not wrap. */
    query,

    async categories(): Promise<Category<F['CATEGORY']>[]> {
      const d = await query<{ categories: WithRaw<Category<F['CATEGORY']>>[] }>(
        `{ categories { ${CATEGORY} } }`,
      );
      return d.categories.map((c) => withFields(c));
    },

    async category(id: string): Promise<Category<F['CATEGORY']>> {
      const d = await query<{ category: WithRaw<Category<F['CATEGORY']>> }>(
        `query ($id: ID!) { category(id: $id) { ${CATEGORY} } }`,
        { id },
      );
      return withFields(d.category);
    },

    async products(): Promise<Product<F['PRODUCT']>[]> {
      const d = await query<{ products: WithRaw<Product<F['PRODUCT']>>[] }>(
        `{ products { ${PRODUCT} } }`,
      );
      return d.products.map((p) => withFields(p));
    },

    async product(id: string): Promise<Product<F['PRODUCT']>> {
      const d = await query<{ product: WithRaw<Product<F['PRODUCT']>> }>(
        `query ($id: ID!) { product(id: $id) { ${PRODUCT} } }`,
        { id },
      );
      return withFields(d.product);
    },

    async createOrder(
      items: { productId: string; quantity: number }[],
    ): Promise<Order<F['ORDER']>> {
      const d = await query<{ createOrder: WithRaw<Order<F['ORDER']>> }>(
        `mutation ($input: CreateOrderInput!) { createOrder(input: $input) { ${ORDER} } }`,
        { input: { items } },
      );
      return withFields(d.createOrder);
    },

    async order(id: string): Promise<Order<F['ORDER']>> {
      const d = await query<{ order: WithRaw<Order<F['ORDER']>> }>(
        `query ($id: ID!) { order(id: $id) { ${ORDER} } }`,
        { id },
      );
      return withFields(d.order);
    },

    async paymentProviders(): Promise<string[]> {
      return (await query<{ paymentProviders: string[] }>('{ paymentProviders }'))
        .paymentProviders;
    },

    async createPayment(orderId: string, provider: string): Promise<PaymentSession> {
      return (
        await query<{ createPayment: PaymentSession }>(
          `mutation ($o: ID!, $p: String!) { createPayment(orderId: $o, provider: $p) { clientSecret payment { ${PAYMENT} } } }`,
          { o: orderId, p: provider },
        )
      ).createPayment;
    },

    async customFieldDefinitions(entityType?: EntityType): Promise<CustomFieldDefinition[]> {
      const fields = 'id name description fieldType entityType enumValues defaultValue isRequired';
      if (entityType) {
        return (
          await query<{ customFieldsByEntity: CustomFieldDefinition[] }>(
            `query ($e: EntityType!) { customFieldsByEntity(entityType: $e) { ${fields} } }`,
            { e: entityType },
          )
        ).customFieldsByEntity;
      }
      return (await query<{ customFields: CustomFieldDefinition[] }>(`{ customFields { ${fields} } }`))
        .customFields;
    },
  };
}

export type ShopClient<F extends StoreFields = StoreFields> = ReturnType<typeof createShopClient<F>>;
