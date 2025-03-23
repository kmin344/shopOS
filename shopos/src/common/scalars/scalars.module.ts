import { Module } from '@nestjs/common';
import { DateScalar } from './date.scalar';
import { DecimalScalar } from './decimal.scalar';

@Module({
  providers: [DateScalar, DecimalScalar],
  exports: [DateScalar, DecimalScalar],
})
export class ScalarsModule {}
