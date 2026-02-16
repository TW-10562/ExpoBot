import { Sequelize } from 'sequelize';
import { config } from '@/config';

const databaseUrl = process.env.DATABASE_URL || config.PostgreSQL?.url;

const seq = databaseUrl
  ? new Sequelize(databaseUrl, {
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
    })
  : new Sequelize(config.MySQL.database, config.MySQL.user, config.MySQL.password, {
      host: config.MySQL.host,
      port: config.MySQL.port,
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

export default seq;
