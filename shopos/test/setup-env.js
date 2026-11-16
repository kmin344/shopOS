// The e2e suite drops and recreates every table, so it never runs against
// the development database. Override the name with E2E_DB_NAME if needed.
process.env.DB_NAME = process.env.E2E_DB_NAME || 'shopos_test';

if (!process.env.DB_NAME.endsWith('_test')) {
  throw new Error(
    `Refusing to run e2e tests against "${process.env.DB_NAME}": the name must end in _test.`,
  );
}

// The suite builds the schema itself from the migrations (see beforeAll).
process.env.DB_MIGRATIONS_RUN = 'false';

// Enables the Stripe connector. The suite replaces HTTP_FETCH, so no request reaches Stripe.
process.env.STRIPE_SECRET_KEY = 'sk_test_e2e';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_e2e';
