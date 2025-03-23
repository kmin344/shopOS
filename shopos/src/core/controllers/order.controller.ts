import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { OrderService } from '../services/order.service';
import { CreateOrderInput } from '../dto/create-order.input';
import { UpdateOrderInput } from '../dto/update-order.input';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiBody({ type: CreateOrderInput })
  @ApiResponse({ status: 201, description: 'Order created successfully.' })
  @ApiResponse({ status: 404, description: 'Products not found.' })
  create(@Body() createOrderInput: CreateOrderInput) {
    return this.orderService.create(createOrderInput);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: 200, description: 'Return all orders.' })
  findAll() {
    return this.orderService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by id' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Return the order.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiBody({ type: UpdateOrderInput })
  @ApiResponse({ status: 200, description: 'Order updated successfully.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  update(@Param('id') id: string, @Body() updateOrderInput: UpdateOrderInput) {
    return this.orderService.update(id, updateOrderInput);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order deleted successfully.' })
  remove(@Param('id') id: string) {
    return this.orderService.remove(id);
  }
}
