import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { Order } from '../entities/order.entity';
import { OrderService } from '../services/order.service';
import { CreateOrderInput } from '../dto/create-order.input';
import { UpdateOrderInput } from '../dto/update-order.input';

@Resolver(() => Order)
export class OrderResolver {
  constructor(private readonly orderService: OrderService) {}

  @Query(() => [Order])
  async orders(): Promise<Order[]> {
    return this.orderService.findAll();
  }

  @Query(() => Order)
  async order(@Args('id', { type: () => ID }) id: string): Promise<Order> {
    return this.orderService.findOne(id);
  }

  @Mutation(() => Order)
  async createOrder(
    @Args('input') createOrderInput: CreateOrderInput,
  ): Promise<Order> {
    return this.orderService.create(createOrderInput);
  }

  @Mutation(() => Order)
  async updateOrder(
    @Args('input') updateOrderInput: UpdateOrderInput,
  ): Promise<Order> {
    return this.orderService.update(updateOrderInput.id, updateOrderInput);
  }

  @Mutation(() => Boolean)
  async removeOrder(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.orderService.remove(id);
  }
}
