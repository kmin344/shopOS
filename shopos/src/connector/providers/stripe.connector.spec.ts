import { createHmac } from 'node:crypto';
import { StripeConnector } from './stripe.connector';
import {
  ProviderRequestError,
  WebhookSignatureError,
} from '../payment-connector';

const SECRET = 'whsec_test_secret';
const NOW = 1_800_000_000_000;

const sign = (body: string, t = NOW / 1000, secret = SECRET) =>
  `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;

const event = (type: string, id = 'pi_123') =>
  JSON.stringify({ type, data: { object: { id, object: 'payment_intent' } } });

describe('StripeConnector', () => {
  const make = (http: jest.Mock = jest.fn()) =>
    new StripeConnector(
      { secretKey: 'sk_test_x', webhookSecret: SECRET, now: () => NOW },
      http,
    );

  describe('createPayment', () => {
    const input = {
      paymentId: 'pay-1',
      orderId: 'order-1',
      amountCents: 1999,
      currency: 'usd',
      idempotencyKey: 'pay-1',
    };

    it('creates a PaymentIntent with the amount, idempotency key and metadata', async () => {
      const http = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 'pi_1', client_secret: 'cs_1' }), {
          status: 200,
        }),
      );
      await expect(make(http).createPayment(input)).resolves.toEqual({
        providerPaymentId: 'pi_1',
        clientSecret: 'cs_1',
      });
      const [url, init] = http.mock.calls[0];
      expect(url).toBe('https://api.stripe.com/v1/payment_intents');
      expect(init.headers.authorization).toBe('Bearer sk_test_x');
      expect(init.headers['idempotency-key']).toBe('pay-1');
      const body = new URLSearchParams(init.body);
      expect(body.get('amount')).toBe('1999');
      expect(body.get('currency')).toBe('usd');
      expect(body.get('metadata[order_id]')).toBe('order-1');
    });

    it('raises ProviderRequestError on a Stripe error response or a network error', async () => {
      const http = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'bad key' } }), {
          status: 401,
        }),
      );
      await expect(make(http).createPayment(input)).rejects.toThrow(
        ProviderRequestError,
      );
      await expect(
        make(
          jest.fn().mockRejectedValue(new TypeError('fetch failed')),
        ).createPayment(input),
      ).rejects.toThrow(ProviderRequestError);
    });
  });

  describe('parseWebhook', () => {
    it('maps succeeded, failed and canceled events', () => {
      const c = make();
      for (const [type, status] of [
        ['payment_intent.succeeded', 'SUCCEEDED'],
        ['payment_intent.payment_failed', 'FAILED'],
        ['payment_intent.canceled', 'FAILED'],
      ]) {
        const body = event(type);
        expect(
          c.parseWebhook(Buffer.from(body), { 'stripe-signature': sign(body) }),
        ).toEqual({ providerPaymentId: 'pi_123', status });
      }
    });

    it('ignores verified events that do not change a payment', () => {
      const body = event('payment_intent.created');
      expect(
        make().parseWebhook(Buffer.from(body), {
          'stripe-signature': sign(body),
        }),
      ).toBeNull();
    });

    it('accepts any one matching v1 signature (secret rotation)', () => {
      const body = event('payment_intent.succeeded');
      const t = NOW / 1000;
      const header = `${sign(body, t, 'old_secret')},${sign(body).split(',')[1]}`;
      expect(
        make().parseWebhook(Buffer.from(body), { 'stripe-signature': header }),
      ).not.toBeNull();
    });

    it.each([
      ['a missing header', undefined],
      ['a malformed header', 'nonsense'],
      [
        'the wrong secret',
        sign(event('payment_intent.succeeded'), NOW / 1000, 'other'),
      ],
      [
        'an old timestamp',
        sign(event('payment_intent.succeeded'), NOW / 1000 - 301),
      ],
    ])('rejects %s', (_label, header) => {
      const body = event('payment_intent.succeeded');
      expect(() =>
        make().parseWebhook(Buffer.from(body), { 'stripe-signature': header }),
      ).toThrow(WebhookSignatureError);
    });

    it('rejects a body changed after signing', () => {
      const header = sign(event('payment_intent.payment_failed'));
      expect(() =>
        make().parseWebhook(Buffer.from(event('payment_intent.succeeded')), {
          'stripe-signature': header,
        }),
      ).toThrow(WebhookSignatureError);
    });
  });
});
