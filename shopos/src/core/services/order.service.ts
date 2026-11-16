import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryFailedError, Repository } from 'typeorm';
import { isUUID } from 'class-validator';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Product } from '../entities/product.entity';
import { CreateOrderInput } from '../dto/create-order.input';
import { UpdateOrderInput } from '../dto/update-order.input';

const MAX_TOTAL_CENTS = 9_999_999_999;
const ORDER_RELATIONS = ['items', 'items.product'];

/** Orders in these states may still be cancelled. */
const CANCELLABLE = [OrderStatus.PENDING, OrderStatus.PROCESSING];

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private dataSource: DataSource,
  ) {}

  /**
   * Places an order and takes the stock in one transaction.
   * Product rows are locked in id order, so two orders for the same products cannot oversell or deadlock.
   */
  async create(input: CreateOrderInput): Promise<Order> {
    const orderId = await this.dataSource.transaction(async (manager) => {
      const ids = input.items.map((i) => i.productId);
      const products = await manager.find(Product, {
        where: { id: In(ids) },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      // Sum in integer cents so totals like 0.10 + 0.20 come out as 0.30.
      let totalCents = 0;
      const items = input.items.map((line) => {
        const product = byId.get(line.productId);
        if (!product) {
          throw new NotFoundException(`Product ${line.productId} not found`);
        }
        if (product.stock < line.quantity) {
          throw new ConflictException(
            `Not enough stock for "${product.name}": ${product.stock} available, ${line.quantity} requested`,
          );
        }
        totalCents += Math.round(product.price * 100) * line.quantity;
        return manager.create(OrderItem, {
          product,
          quantity: line.quantity,
          unitPrice: product.price,
        });
      });
      if (totalCents > MAX_TOTAL_CENTS) {
        throw new BadRequestException('Order total exceeds 99,999,999.99');
      }

      for (const line of input.items) {
        await manager.decrement(
          Product,
          { id: line.productId },
          'stock',
          line.quantity,
        );
      }

      const order = await manager.save(
        manager.create(Order, { totalAmount: totalCents / 100, items }),
      );
      return order.id;
    });
    return this.findOne(orderId);
  }

  async findAll(): Promise<Order[]> {
    return await this.orderRepository.find({
      relations: ORDER_RELATIONS,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Order> {
    const order = isUUID(id)
      ? await this.orderRepository.findOne({
          where: { id },
          relations: ORDER_RELATIONS,
        })
      : null;
    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    return order;
  }

  /**
   * Changes the status. Cancelling puts the stock back, once.
   * A cancelled order cannot be reopened, and a shipped or delivered order cannot be cancelled.
   */
  async update(id: string, input: UpdateOrderInput): Promise<Order> {
    const { status } = input;
    if (!status) return this.findOne(id);
    if (!isUUID(id)) throw new NotFoundException(`Order ${id} not found`);

    await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id },
        relations: ORDER_RELATIONS,
        lock: { mode: 'pessimistic_write', tables: ['order'] },
      });
      if (!order) {
        throw new NotFoundException(`Order ${id} not found`);
      }
      if (order.status === status) return;

      if (order.status === OrderStatus.CANCELLED) {
        throw new ConflictException('A cancelled order cannot be reopened');
      }
      if (status === OrderStatus.CANCELLED) {
        if (!CANCELLABLE.includes(order.status)) {
          throw new ConflictException(
            `A ${order.status} order cannot be cancelled`,
          );
        }
        for (const item of order.items) {
          await manager.increment(
            Product,
            { id: item.product.id },
            'stock',
            item.quantity,
          );
        }
      }
      order.status = status;
      await manager.save(Order, order);
    });
    return this.findOne(id);
  }

  /** Deleting an order does not change stock. Cancel the order first to release its stock. */
  async remove(id: string): Promise<boolean> {
    await this.findOne(id);
    try {
      const result = await this.orderRepository.delete(id);
      return result.affected > 0;
    } catch (err) {
      // 23503 = foreign key violation: payment records point at this order and must be kept.
      if (
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string })?.code === '23503'
      ) {
        throw new ConflictException(
          `Order ${id} has payment records and cannot be deleted; cancel it instead`,
        );
      }
      throw err;
    }
  }
}
