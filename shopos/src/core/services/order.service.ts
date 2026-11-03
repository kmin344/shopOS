import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUUID } from 'class-validator';
import { Order, OrderStatus } from '../entities/order.entity';
import { CreateOrderInput } from '../dto/create-order.input';
import { UpdateOrderInput } from '../dto/update-order.input';
import { ProductService } from './product.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private productService: ProductService,
  ) {}

  async create(createOrderInput: CreateOrderInput): Promise<Order> {
    const order = this.orderRepository.create();

    // Fetch products and calculate total
    const products = await Promise.all(
      createOrderInput.productIds.map((id) => this.productService.findOne(id)),
    );

    order.products = products;
    // Sum in integer cents so totals like 0.10 + 0.20 come out as 0.30.
    const totalCents = products.reduce(
      (sum, product) => sum + Math.round(product.price * 100),
      0,
    );
    order.totalAmount = totalCents / 100;

    return await this.orderRepository.save(order);
  }

  async findAll(): Promise<Order[]> {
    return await this.orderRepository.find({
      relations: ['products'],
    });
  }

  async findOne(id: string): Promise<Order> {
    const order = isUUID(id)
      ? await this.orderRepository.findOne({
          where: { id },
          relations: ['products'],
        })
      : null;
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    return order;
  }

  async update(id: string, updateOrderInput: UpdateOrderInput): Promise<Order> {
    const order = await this.findOne(id);

    if (updateOrderInput.status) {
      order.status = updateOrderInput.status as OrderStatus;
    }

    return await this.orderRepository.save(order);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.orderRepository.delete(id);
    return result.affected > 0;
  }
}
