import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { Order } from './entities/order.entity';
import { ProductService } from './services/product.service';
import { CategoryService } from './services/category.service';
import { OrderService } from './services/order.service';
import { ProductResolver } from './resolvers/product.resolver';
import { CategoryResolver } from './resolvers/category.resolver';
import { OrderResolver } from './resolvers/order.resolver';
import { CustomFieldModule } from '../custom-field/custom-field.module';
import { ProductCustomFieldsResolver } from './resolvers/product-custom-fields.resolver';
import { CategoryCustomFieldsResolver } from './resolvers/category-custom-fields.resolver';
import { OrderCustomFieldsResolver } from './resolvers/order-custom-fields.resolver';
import { ProductController } from './controllers/product.controller';
import { CategoryController } from './controllers/category.controller';
import { OrderController } from './controllers/order.controller';
import { ScalarsModule } from '../common/scalars/scalars.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category, Order]),
    CustomFieldModule,
    ScalarsModule,
  ],
  controllers: [ProductController, CategoryController, OrderController],
  providers: [
    ProductService,
    CategoryService,
    OrderService,
    ProductResolver,
    CategoryResolver,
    OrderResolver,
    ProductCustomFieldsResolver,
    CategoryCustomFieldsResolver,
    OrderCustomFieldsResolver,
  ],
  exports: [ProductService, CategoryService, OrderService],
})
export class CoreModule {}
