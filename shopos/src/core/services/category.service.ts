import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CreateCategoryInput } from '../dto/create-category.input';
import { UpdateCategoryInput } from '../dto/update-category.input';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryInput: CreateCategoryInput): Promise<Category> {
    const category = this.categoryRepository.create(createCategoryInput);
    return await this.categoryRepository.save(category);
  }

  async findAll(): Promise<Category[]> {
    return await this.categoryRepository.find({
      relations: ['products'],
    });
  }

  async findOne(id: string): Promise<Category> {
    const category = isUUID(id)
      ? await this.categoryRepository.findOne({
          where: { id },
          relations: ['products'],
        })
      : null;
    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    return category;
  }

  async update(
    id: string,
    updateCategoryInput: UpdateCategoryInput,
  ): Promise<Category> {
    await this.findOne(id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...fields } = updateCategoryInput;
    await this.categoryRepository.update(id, fields);
    return this.findOne(id);
  }

  async remove(id: string): Promise<boolean> {
    const category = await this.findOne(id);
    if (category.products?.length) {
      throw new ConflictException(
        `Category ${id} still has ${category.products.length} product(s); move or delete them first`,
      );
    }
    const result = await this.categoryRepository.delete(id);
    return result.affected > 0;
  }
}
