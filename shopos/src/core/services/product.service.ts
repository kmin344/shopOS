import { Injectable, NotFoundException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { CreateProductInput } from '../dto/create-product.input';
import { CategoryService } from './category.service';
import { UpdateProductInput } from '../dto/update-product.input';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private categoryService: CategoryService,
  ) {}

  async create(createProductInput: CreateProductInput): Promise<Product> {
    const { categoryId, ...fields } = createProductInput;
    await this.categoryService.findOne(categoryId);
    const product = this.productRepository.create({
      ...fields,
      category: { id: categoryId },
    });
    const saved = await this.productRepository.save(product);
    return this.findOne(saved.id);
  }

  async findAll(): Promise<Product[]> {
    return await this.productRepository.find({
      relations: ['category'],
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = isUUID(id)
      ? await this.productRepository.findOne({
          where: { id },
          relations: ['category'],
        })
      : null;
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }

  async update(
    id: string,
    updateProductInput: UpdateProductInput,
  ): Promise<Product> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, categoryId, ...fields } = updateProductInput;
    await this.findOne(id);
    if (categoryId) {
      await this.categoryService.findOne(categoryId);
    }
    await this.productRepository.update(id, {
      ...fields,
      ...(categoryId ? { category: { id: categoryId } } : {}),
    });
    return this.findOne(id);
  }

  async remove(id: string): Promise<boolean> {
    await this.findOne(id);
    const result = await this.productRepository.delete(id);
    return result.affected > 0;
  }
}
