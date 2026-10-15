import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  // Railway provides DATABASE_URL; use it when available
  url: process.env.DATABASE_URL || undefined,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'quad',
}));
