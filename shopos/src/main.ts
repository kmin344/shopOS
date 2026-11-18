import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DateModel } from './common/scalars/date.scalar';
import { DecimalModel } from './common/scalars/decimal.scalar';

async function bootstrap() {
  // rawBody: payment webhooks verify signatures over the exact bytes sent.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();
  app.enableShutdownHooks();

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

  await app.listen(
    Number(process.env.PORT ?? 3000),
    process.env.HOST ?? '0.0.0.0',
  );
  console.log(`ShopOS is running on: ${await app.getUrl()}`);
}
bootstrap();
