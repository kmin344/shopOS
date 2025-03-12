import { InputType, Field, ID } from '@nestjs/graphql';
import { OrderStatus } from '../entities/order.entity';

@InputType()
export class UpdateOrderInput {
  @Field(() => ID)
  id: string;

  @Field(() => OrderStatus, { nullable: true })
  status?: OrderStatus;
}
