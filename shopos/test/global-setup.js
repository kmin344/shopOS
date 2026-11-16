// Creates the e2e database if it does not exist yet.
const { Client } = require('pg');

module.exports = async () => {
  require('./setup-env');
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres',
  });
  await client.connect();
  const name = process.env.DB_NAME;
  const { rowCount } = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [name],
  );
  if (rowCount === 0) {
    await client.query(`CREATE DATABASE "${name}"`);
  }
  await client.end();
};
