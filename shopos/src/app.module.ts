import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: true,
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
  ],
  controllers: [HealthController],
})
export class AppModule {}
