import { DataSource } from 'typeorm';
import { dataSourceOptions } from './options';

// Entry point for the TypeORM CLI (yarn migration:*). The app does not import this file.
try {
  process.loadEnvFile();
} catch {
  // no .env file: use the shell environment
}
export default new DataSource(dataSourceOptions());
