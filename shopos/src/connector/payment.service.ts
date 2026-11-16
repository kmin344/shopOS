import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { isUUID } from 'class-validator';
import { Order, OrderStatus } from '../core/entities/order.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import {
  PAYMENT_CONNECTORS,
  PaymentConnector,
  ProviderEvent,
} from './payment-connector';

export interface PaymentSessionResult {
  payment: Payment;
  clientSecret: string | null;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly connectors: Map<string, PaymentConnector>;

  constructor(
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
    private readonly dataSource: DataSource,
    @Inject(PAYMENT_CONNECTORS) connectors: PaymentConnector[],
  ) {
    this.connectors = new Map(connectors.map((c) => [c.name, c]));
  }

  /** Names of the providers that are configured in this deployment. */
  providers(): string[] {
    return [...this.connectors.keys()];
  }

  connector(name: string): PaymentConnector {
    const connector = this.connectors.get(name);
    if (!connector) {
      throw new BadRequestException(
        `Payment provider "${name}" is not configured`,
      );
    }
    return connector;
  }

  /** Starts a payment for the full order total. The order must be PENDING and not already paid. */
  async createPayment(
    orderId: string,
    providerName: string,
  ): Promise<PaymentSessionResult> {
    const connector = this.connector(providerName);
    const order = isUUID(orderId)
      ? await this.dataSource.getRepository(Order).findOneBy({ id: orderId })
      : null;
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictException(
        `Only a PENDING order can be paid; this order is ${order.status}`,
      );
    }
    if (
      await this.payments.existsBy({
        orderId,
        status: PaymentStatus.SUCCEEDED,
      })
    ) {
      throw new ConflictException(`Order ${orderId} is already paid`);
    }

    const payment = await this.payments.save(
      this.payments.create({
        orderId,
        provider: connector.name,
        amount: order.totalAmount,
        currency: (process.env.SHOP_CURRENCY ?? 'usd').toLowerCase(),
      }),
    );

    try {
      const result = await connector.createPayment({
        paymentId: payment.id,
        orderId,
        amountCents: Math.round(order.totalAmount * 100),
        currency: payment.currency,
        idempotencyKey: payment.id,
      });
      payment.providerPaymentId = result.providerPaymentId;
      await this.payments.save(payment);
      return { payment, clientSecret: result.clientSecret };
    } catch (err) {
      // The provider's message stays in the log; the caller gets a generic error.
      this.logger.error(
        `payment ${payment.id} via ${connector.name} failed: ${String(err)}`,
      );
      payment.status = PaymentStatus.FAILED;
      await this.payments.save(payment);
      throw new BadGatewayException('The payment provider is not available');
    }
  }

  findByOrder(orderId: string): Promise<Payment[]> {
    if (!isUUID(orderId)) return Promise.resolve([]);
    return this.payments.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Applies a verified provider event. Safe to receive more than once:
   * only a PENDING payment changes, and a success moves a PENDING order to PROCESSING in the same transaction.
   * Returns false when no payment matches the event.
   */
  async applyEvent(provider: string, event: ProviderEvent): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { provider, providerPaymentId: event.providerPaymentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) return false;
      if (payment.status !== PaymentStatus.PENDING) return true;

      payment.status = PaymentStatus[event.status];
      await manager.save(payment);
      if (payment.status === PaymentStatus.SUCCEEDED) {
        await manager.update(
          Order,
          { id: payment.orderId, status: OrderStatus.PENDING },
          { status: OrderStatus.PROCESSING },
        );
      }
      return true;
    });
  }
}
