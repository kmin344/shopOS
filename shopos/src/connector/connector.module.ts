import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import {
  HTTP_FETCH,
  HttpFetch,
  PAYMENT_CONNECTORS,
  PaymentConnector,
} from './payment-connector';
import { StripeConnector } from './providers/stripe.connector';
import { PaymentService } from './payment.service';
import { PaymentResolver } from './payment.resolver';
import { PaymentWebhookController } from './payment-webhook.controller';

/** Builds the list of configured providers from the environment. A provider without its keys is left out. */
function buildConnectors(http: HttpFetch): PaymentConnector[] {
  const connectors: PaymentConnector[] = [];
  const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = process.env;
  if (STRIPE_SECRET_KEY && STRIPE_WEBHOOK_SECRET) {
    connectors.push(
      new StripeConnector(
        { secretKey: STRIPE_SECRET_KEY, webhookSecret: STRIPE_WEBHOOK_SECRET },
        http,
      ),
    );
  }
  new Logger('ConnectorModule').log(
    `payment providers: ${connectors.map((c) => c.name).join(', ') || 'none'}`,
  );
  return connectors;
}

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  controllers: [PaymentWebhookController],
  providers: [
    { provide: HTTP_FETCH, useValue: globalThis.fetch },
    {
      provide: PAYMENT_CONNECTORS,
      inject: [HTTP_FETCH],
      useFactory: buildConnectors,
    },
    PaymentService,
    PaymentResolver,
  ],
  exports: [PaymentService],
})
export class ConnectorModule {}
