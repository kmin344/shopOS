import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { Product } from '../entities/product.entity';
import { ProductService } from '../services/product.service';
import { CreateProductInput } from '../dto/create-product.input';
import { UpdateProductInput } from '../dto/update-product.input';

@Resolver(() => Product)
export class ProductResolver {
  constructor(private readonly productService: ProductService) {}

  @Query(() => [Product])
  async products(): Promise<Product[]> {
    return this.productService.findAll();
  }

  @Query(() => Product)
  async product(@Args('id', { type: () => ID }) id: string): Promise<Product> {
    return this.productService.findOne(id);
  }

  @Mutation(() => Product)
  async createProduct(
    @Args('input') createProductInput: CreateProductInput,
  ): Promise<Product> {
    return this.productService.create(createProductInput);
  }

  @Mutation(() => Product)
  async updateProduct(
    @Args('input') updateProductInput: UpdateProductInput,
  ): Promise<Product> {
    return this.productService.update(
      updateProductInput.id,
      updateProductInput,
    );
  }

  @Mutation(() => Boolean)
  async removeProduct(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.productService.remove(id);
  }
}
