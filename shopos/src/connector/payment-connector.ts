/** The result a provider returns when a payment is started. */
export interface ProviderPayment {
  providerPaymentId: string;
  /** Secret the storefront passes to the provider's client library to finish the payment. */
  clientSecret: string | null;
}

/** A payment status change reported by a provider webhook. */
export interface ProviderEvent {
  providerPaymentId: string;
  status: 'SUCCEEDED' | 'FAILED';
}

export interface CreateProviderPaymentInput {
  paymentId: string;
  orderId: string;
  amountCents: number;
  currency: string;
  /** Sent to the provider so a retried call does not charge twice. */
  idempotencyKey: string;
}

/**
 * A standard interface for a payment provider.
 * Add a provider by implementing this interface and registering it in connector.module.ts.
 */
export interface PaymentConnector {
  /** Stable name used in the API and in the webhook URL, for example "stripe". */
  readonly name: string;
  createPayment(input: CreateProviderPaymentInput): Promise<ProviderPayment>;
  /**
   * Verifies a webhook and returns the payment status change it reports.
   * Returns null for verified events that do not change a payment status.
   * Throws WebhookSignatureError when the request is not authentic.
   */
  parseWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): ProviderEvent | null;
}

export class WebhookSignatureError extends Error {}
export class ProviderRequestError extends Error {}

export const PAYMENT_CONNECTORS = Symbol('PAYMENT_CONNECTORS');
/** The HTTP client connectors use. Tests replace it; production uses the global fetch. */
export const HTTP_FETCH = Symbol('HTTP_FETCH');
export type HttpFetch = typeof fetch;
