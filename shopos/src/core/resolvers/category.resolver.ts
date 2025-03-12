import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { Category } from '../entities/category.entity';
import { CategoryService } from '../services/category.service';
import { CreateCategoryInput } from '../dto/create-category.input';
import { UpdateCategoryInput } from '../dto/update-category.input';

@Resolver(() => Category)
export class CategoryResolver {
  constructor(private readonly categoryService: CategoryService) {}

  @Query(() => [Category])
  async categories(): Promise<Category[]> {
    return this.categoryService.findAll();
  }

  @Query(() => Category)
  async category(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<Category> {
    return this.categoryService.findOne(id);
  }

  @Mutation(() => Category)
  async createCategory(
    @Args('input') createCategoryInput: CreateCategoryInput,
  ): Promise<Category> {
    return this.categoryService.create(createCategoryInput);
  }

  @Mutation(() => Category)
  async updateCategory(
    @Args('input') updateCategoryInput: UpdateCategoryInput,
  ): Promise<Category> {
    return this.categoryService.update(
      updateCategoryInput.id,
      updateCategoryInput,
    );
  }

  @Mutation(() => Boolean)
  async removeCategory(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.categoryService.remove(id);
  }
}
