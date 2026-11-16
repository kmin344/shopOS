import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Param,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { WebhookSignatureError } from './payment-connector';
import { PaymentService } from './payment.service';

@ApiExcludeController()
@Controller('webhooks/payments')
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(private readonly paymentService: PaymentService) {}

  /** Providers call this URL, for example /webhooks/payments/stripe. Needs the raw body (rawBody: true in main.ts). */
  @Post(':provider')
  @HttpCode(200)
  async receive(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const connector = this.paymentService.connector(provider);
    if (!req.rawBody) throw new BadRequestException('empty body');

    let event;
    try {
      event = connector.parseWebhook(req.rawBody, headers);
    } catch (err) {
      if (err instanceof WebhookSignatureError || err instanceof SyntaxError) {
        this.logger.warn(`rejected ${provider} webhook: ${err.message}`);
        throw new BadRequestException('invalid webhook');
      }
      throw err;
    }
    if (event && !(await this.paymentService.applyEvent(provider, event))) {
      this.logger.warn(
        `${provider} webhook for unknown payment ${event.providerPaymentId}`,
      );
    }
    return { received: true };
  }
}
