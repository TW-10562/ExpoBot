import { Sequelize } from 'sequelize';
import { config } from '@/config';

// Build DB connection: prefer explicit DB_MODE or PostgreSQL settings.
const postgresUrl = process.env.DATABASE_URL || (config as any).PostgreSQL?.url;
const dbMode = (process.env.DB_MODE || '').toLowerCase();

let seq: Sequelize;

if (dbMode === 'postgres' || postgresUrl) {
  // Prefer DATABASE_URL, else build from env/config
  const connectionString = process.env.DATABASE_URL || postgresUrl;
  if (connectionString) {
    seq = new Sequelize(connectionString, {
      dialect: 'postgres',
      timezone: '+09:00',
      logging: false,
      define: {
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        underscored: true,
      },
      pool: {
        max: 50,
        min: 0,
        idle: 10000,
      },
      dialectOptions: {
        ssl: process.env.PG_SSL === 'true' ? { require: true, rejectUnauthorized: false } : undefined,
      },
    });
  } else {
    // Build from PG_* env vars if DATABASE_URL not provided
    seq = new Sequelize(
      (process.env.PG_DATABASE || (config as any).PostgreSQL?.database) || 'postgres',
      (process.env.PG_USER || (config as any).PostgreSQL?.user) || 'postgres',
      process.env.PG_PASSWORD || (config as any).PostgreSQL?.password || undefined,
      {
        host: process.env.PG_HOST || (config as any).PostgreSQL?.host || 'localhost',
        port: Number(process.env.PG_PORT || (config as any).PostgreSQL?.port || 5432),
        dialect: 'postgres',
        timezone: '+09:00',
        logging: false,
        define: {
          timestamps: true,
          createdAt: 'created_at',
          updatedAt: 'updated_at',
          underscored: true,
        },
        pool: {
          max: 50,
          min: 0,
          idle: 10000,
        },
        dialectOptions: {
          ssl: process.env.PG_SSL === 'true' ? { require: true, rejectUnauthorized: false } : undefined,
        },
      },
    );
  }
} else {
  // Only initialize MySQL when DB_MODE explicitly not set to postgres
  seq = new Sequelize(
    config.MySQL.database,
    config.MySQL.user,
    config.MySQL.password,
    {
      host: config.MySQL.host,
      port: config.MySQL.port,
      dialect: 'mysql',
      timezone: '+09:00',
      logging: false,
      define: {
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        underscored: true,
      },
      pool: {
        max: 50,
        min: 0,
        idle: 10000,
      },
    }
  );
}

export default seq;

