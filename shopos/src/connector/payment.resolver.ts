import {
  Args,
  Field,
  ID,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './payment.service';
import { Public } from '../auth/public.decorator';

@ObjectType()
export class PaymentSession {
  @Field(() => Payment)
  payment: Payment;

  /** Pass this to the provider's client library (for Stripe: stripe.confirmPayment). */
  @Field(() => String, { nullable: true })
  clientSecret: string | null;
}

@Public()
@Resolver(() => Payment)
export class PaymentResolver {
  constructor(private readonly paymentService: PaymentService) {}

  @Query(() => [String], { description: 'Configured payment providers' })
  paymentProviders(): string[] {
    return this.paymentService.providers();
  }

  @Query(() => [Payment])
  payments(@Args('orderId', { type: () => ID }) orderId: string) {
    return this.paymentService.findByOrder(orderId);
  }

  @Mutation(() => PaymentSession)
  createPayment(
    @Args('orderId', { type: () => ID }) orderId: string,
    @Args('provider') provider: string,
  ): Promise<PaymentSession> {
    return this.paymentService.createPayment(orderId, provider);
  }
}
