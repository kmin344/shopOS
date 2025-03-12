import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomField } from './entities/custom-field.entity';
import { CustomFieldValue } from './entities/custom-field-value.entity';
import { CustomFieldService } from './services/custom-field.service';
import { CustomFieldValueService } from './services/custom-field-value.service';
import { CustomFieldResolver } from './resolvers/custom-field.resolver';
import { CustomFieldValueResolver } from './resolvers/custom-field-value.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([CustomField, CustomFieldValue])],
  providers: [
    CustomFieldService,
    CustomFieldValueService,
    CustomFieldResolver,
    CustomFieldValueResolver,
  ],
  exports: [CustomFieldService, CustomFieldValueService],
})
export class CustomFieldModule {}
