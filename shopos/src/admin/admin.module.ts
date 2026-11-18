import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminResolver } from './admin.resolver';

@Module({
  controllers: [AdminController],
  providers: [AdminResolver],
})
export class AdminModule {}
