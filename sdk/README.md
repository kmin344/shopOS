# shopos-sdk

Typed client for the [ShopOS](../README.md) API. No runtime dependencies; it uses `fetch` (Node 18+ or any browser).

## Typed custom fields for your store

Each store defines its own custom fields at runtime. Generate types for them:

```bash
npx shopos-sdk types --url https://shop.example.com/graphql --out src/shop-fields.ts
```

Then pass the type to the client:

```ts
import { createShopClient } from 'shopos-sdk';
import type { ShopFields } from './shop-fields';

const shop = createShopClient<ShopFields>({ url: 'https://shop.example.com/graphql' });

const product = await shop.product(id);
product.fields.Size;   // "S" | "M" | undefined, from the store's ENUM options
product.fields.Weight; // a type error if the store has no "Weight" field
```

Run `shopos-sdk types` again after you add or change fields. Values arrive converted: `NUMBER` as `number`, `BOOLEAN` as `boolean`, `DATE`, `STRING` and `ENUM` as `string`. Every field is optional, because an existing record may have no value.

## Storefront flow

```ts
const products = await shop.products();
const order = await shop.createOrder([{ productId: products[0].id, quantity: 2 }]);
const { clientSecret } = await shop.createPayment(order.id, 'stripe');
// Finish the payment in the browser with Stripe.js and clientSecret.
```

Other methods: `categories()`, `category(id)`, `order(id)`, `paymentProviders()`, `customFieldDefinitions(entityType?)`, and `query(document, variables)` for any other GraphQL operation.

Errors from the API throw `ShopApiError` with the server's message.

## Admin use

`createShopClient({ url, adminKey })` sends `Authorization: Bearer <key>`. Use this only on a server. Never put an admin key in browser code.

## Development

```bash
npm ci
npm test   # builds, then runs the unit tests with node --test
```

The ShopOS e2e suite also runs this client against a live server, so a query that does not match the schema fails CI there.

The package is not published to npm yet.
