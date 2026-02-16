import Redis from 'ioredis';
import { config } from '@config/index';

const redis = new Redis({
  port: Number(process.env.REDIS_PORT ?? config.Redis.port ?? 6379),
  host: process.env.REDIS_HOST ?? config.Redis.host ?? '127.0.0.1',
  password: process.env.REDIS_PASSWORD ?? config.Redis.password ?? '',
  db: Number(process.env.REDIS_DB ?? config.Redis.database ?? 0),
});

redis.on('error', (error) => {
  console.error('[Redis] connection error:', error.message);
});

export default redis;
