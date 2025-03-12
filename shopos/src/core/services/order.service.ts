import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

    if (products.some((p) => !p)) {
      throw new NotFoundException('Some products were not found');
    }

    order.products = products;
    order.totalAmount = products.reduce(
      (sum, product) => sum + product.price,
      0,
    );

    return await this.orderRepository.save(order);
  }

  async findAll(): Promise<Order[]> {
    return await this.orderRepository.find({
      relations: ['products'],
    });
  }

  async findOne(id: string): Promise<Order> {
    return await this.orderRepository.findOne({
      where: { id },
      relations: ['products'],
    });
  }

  async update(id: string, updateOrderInput: UpdateOrderInput): Promise<Order> {
    const order = await this.findOne(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

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
