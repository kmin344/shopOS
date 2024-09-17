import { Module } from '@nestjs/common';
import { CustomFieldService } from './custom-field.service';

@Module({
  providers: [CustomFieldService]
})
export class CustomFieldModule {}
