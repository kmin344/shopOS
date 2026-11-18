import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  CreateProviderPaymentInput,
  HttpFetch,
  PaymentConnector,
  ProviderEvent,
  ProviderPayment,
  ProviderRequestError,
  WebhookSignatureError,
} from '../payment-connector';

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  apiBase?: string;
  /** Maximum age of a webhook signature, in seconds. Stripe's default is 300. */
  toleranceSeconds?: number;
  now?: () => number;
}

/** Stripe PaymentIntents over the REST API (no SDK). */
export class StripeConnector implements PaymentConnector {
  readonly name = 'stripe';

  constructor(
    private readonly config: StripeConfig,
    private readonly http: HttpFetch,
  ) {}

  async createPayment(
    input: CreateProviderPaymentInput,
  ): Promise<ProviderPayment> {
    const body = new URLSearchParams({
      amount: String(input.amountCents),
      currency: input.currency,
      'automatic_payment_methods[enabled]': 'true',
      'metadata[order_id]': input.orderId,
      'metadata[payment_id]': input.paymentId,
    });
    let res: Response;
    try {
      res = await this.http(
        `${this.config.apiBase ?? 'https://api.stripe.com'}/v1/payment_intents`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${this.config.secretKey}`,
            'content-type': 'application/x-www-form-urlencoded',
            'idempotency-key': input.idempotencyKey,
          },
          body,
          signal: AbortSignal.timeout(15_000),
        },
      );
    } catch (err) {
      throw new ProviderRequestError(`stripe request failed: ${String(err)}`);
    }
    const json = (await res.json().catch(() => null)) as {
      id?: string;
      client_secret?: string;
      error?: { message?: string };
    } | null;
    if (!res.ok || !json?.id) {
      throw new ProviderRequestError(
        `stripe returned ${res.status}: ${json?.error?.message ?? 'no payment intent'}`,
      );
    }
    return {
      providerPaymentId: json.id,
      clientSecret: json.client_secret ?? null,
    };
  }

  parseWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): ProviderEvent | null {
    this.verifySignature(rawBody, first(headers['stripe-signature']));

    const event = JSON.parse(rawBody.toString('utf8')) as {
      type?: string;
      data?: { object?: { id?: string; object?: string } };
    };
    const intent = event.data?.object;
    if (intent?.object !== 'payment_intent' || !intent.id) return null;
    switch (event.type) {
      case 'payment_intent.succeeded':
        return { providerPaymentId: intent.id, status: 'SUCCEEDED' };
      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled':
        return { providerPaymentId: intent.id, status: 'FAILED' };
      default:
        return null;
    }
  }

  /** Stripe-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">[,v1=...] */
  private verifySignature(rawBody: Buffer, header: string | undefined) {
    if (!header) throw new WebhookSignatureError('missing Stripe-Signature');
    const parts = header.split(',').map((p) => p.split('=', 2));
    const timestamp = Number(parts.find(([k]) => k === 't')?.[1]);
    const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
    if (!Number.isInteger(timestamp) || signatures.length === 0) {
      throw new WebhookSignatureError('malformed Stripe-Signature');
    }
    const now = Math.floor((this.config.now?.() ?? Date.now()) / 1000);
    if (Math.abs(now - timestamp) > (this.config.toleranceSeconds ?? 300)) {
      throw new WebhookSignatureError('Stripe-Signature timestamp is too old');
    }
    const expected = createHmac('sha256', this.config.webhookSecret)
      .update(`${timestamp}.`)
      .update(rawBody)
      .digest();
    const ok = signatures.some(
      (sig) =>
        /^[0-9a-f]{64}$/i.test(sig) &&
        timingSafeEqual(Buffer.from(sig, 'hex'), expected),
    );
    if (!ok) throw new WebhookSignatureError('Stripe-Signature does not match');
  }
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
