import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DateModel } from './common/scalars/date.scalar';
import { DecimalModel } from './common/scalars/decimal.scalar';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('ShopOS API')
    .setDescription('The ShopOS API description')
    .setVersion('1.0')
    .addTag('shopos')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [DateModel, DecimalModel],
  });
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
  console.log(`ShopOS is running on: ${await app.getUrl()}`);
}
bootstrap();
