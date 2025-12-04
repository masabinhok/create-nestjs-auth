import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

config();

export const AppDataSource = new DataSource({
  type: (process.env.DB_TYPE as any) || 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, RefreshToken],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});
