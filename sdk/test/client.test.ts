import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createShopClient, ShopApiError } from '../src';

type Call = { url: string; init: RequestInit };

function stubFetch(responses: unknown[], status = 200) {
  const calls: Call[] = [];
  const fetchStub = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(responses.shift()), { status });
  }) as unknown as typeof fetch;
  return { fetchStub, calls };
}

// A store's generated types, as `shopos-sdk types` would write them.
interface ShopFields {
  PRODUCT: { Size?: 'S' | 'M' | 'L'; Weight?: number };
  CATEGORY: {};
  ORDER: { 'Gift message'?: string };
}

test('product() returns typed custom fields', async () => {
  const { fetchStub, calls } = stubFetch([
    {
      data: {
        product: {
          id: 'p1',
          name: 'Shirt',
          description: null,
          price: 20,
          stock: 3,
          category: { id: 'c1', name: 'Tops' },
          customFieldValues: [
            { value: 'M', customField: { name: 'Size', fieldType: 'ENUM' } },
            { value: '180', customField: { name: 'Weight', fieldType: 'NUMBER' } },
          ],
        },
      },
    },
  ]);
  const shop = createShopClient<ShopFields>({ url: 'http://shop.test/graphql', fetch: fetchStub });
  const p = await shop.product('p1');

  // Compile-time check: these lines only build if the generated types flow through.
  const size: 'S' | 'M' | 'L' | undefined = p.fields.Size;
  const weight: number | undefined = p.fields.Weight;
  assert.equal(size, 'M');
  assert.equal(weight, 180);
  assert.equal('customFieldValues' in p, false);

  const sent = JSON.parse(String(calls[0].init.body));
  assert.deepEqual(sent.variables, { id: 'p1' });
  assert.equal((calls[0].init.headers as Record<string, string>).authorization, undefined);
});

test('createOrder sends items and the admin key only when given', async () => {
  const { fetchStub, calls } = stubFetch([
    {
      data: {
        createOrder: {
          id: 'o1', status: 'PENDING', totalAmount: 40, createdAt: '2026-11-16T00:00:00Z',
          items: [], customFieldValues: [],
        },
      },
    },
  ]);
  const shop = createShopClient({ url: 'http://x/graphql', fetch: fetchStub, adminKey: 'k' });
  const order = await shop.createOrder([{ productId: 'p1', quantity: 2 }]);
  assert.equal(order.status, 'PENDING');
  assert.deepEqual(order.fields, {});
  const sent = JSON.parse(String(calls[0].init.body));
  assert.deepEqual(sent.variables.input.items, [{ productId: 'p1', quantity: 2 }]);
  assert.equal((calls[0].init.headers as Record<string, string>).authorization, 'Bearer k');
});

test('GraphQL errors and non-JSON answers become ShopApiError', async () => {
  const errors = stubFetch([{ data: null, errors: [{ message: 'Product x not found' }] }]);
  const shop = createShopClient({ url: 'http://x/graphql', fetch: errors.fetchStub });
  await assert.rejects(shop.product('x'), (e: unknown) => {
    assert.ok(e instanceof ShopApiError);
    assert.equal(e.message, 'Product x not found');
    return true;
  });

  const html = (async () => new Response('<html>', { status: 502 })) as unknown as typeof fetch;
  await assert.rejects(
    createShopClient({ url: 'http://x/graphql', fetch: html }).products(),
    /returned 502 without JSON/,
  );
});
