import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';

/**
 * One database configuration for the app and for the TypeORM CLI.
 * The schema comes only from migrations (synchronize is always off).
 */
export function dataSourceOptions(
  env: NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 5432),
    username: env.DB_USERNAME ?? 'postgres',
    password: env.DB_PASSWORD ?? 'postgres',
    database: env.DB_NAME ?? 'shopos',
    ssl: env.DB_SSL === 'true',
    entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
    migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
    synchronize: false,
    // Set DB_MIGRATIONS_RUN=false when a deploy step runs migrations instead (see README).
    migrationsRun: env.DB_MIGRATIONS_RUN !== 'false',
  };
}
