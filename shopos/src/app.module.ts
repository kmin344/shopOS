import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { CoreModule } from './core/core.module';
import { CustomFieldModule } from './custom-field/custom-field.module';
import { ConnectorModule } from './connector/connector.module';
import { ScalarsModule } from './common/scalars/scalars.module';
import { dataSourceOptions } from './database/options';
import { HealthController } from './health.controller';
import { AdminKeyGuard } from './auth/admin-key.guard';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      // The playground is a development tool; production clients use the API directly.
      playground: process.env.NODE_ENV !== 'production',
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    // ConfigModule loads .env into process.env before this factory runs.
    TypeOrmModule.forRootAsync({
      useFactory: () => dataSourceOptions(),
    }),
    CoreModule,
    CustomFieldModule,
    ConnectorModule,
    ScalarsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: AdminKeyGuard }],
})
export class AppModule {}
