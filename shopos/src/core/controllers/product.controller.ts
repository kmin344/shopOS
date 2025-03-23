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
import { ProductService } from '../services/product.service';
import { CreateProductInput } from '../dto/create-product.input';
import { UpdateProductInput } from '../dto/update-product.input';

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiBody({ type: CreateProductInput })
  @ApiResponse({ status: 201, description: 'Product created successfully.' })
  create(@Body() createProductInput: CreateProductInput) {
    return this.productService.create(createProductInput);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'Return all products.' })
  findAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by id' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Return the product.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiBody({ type: UpdateProductInput })
  @ApiResponse({ status: 200, description: 'Product updated successfully.' })
  update(
    @Param('id') id: string,
    @Body() updateProductInput: UpdateProductInput,
  ) {
    return this.productService.update(id, updateProductInput);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully.' })
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}
