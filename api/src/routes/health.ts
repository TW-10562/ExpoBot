import Router from 'koa-router';
import { getDbStatus } from '@/db/adapter';

const router = new Router();

router.get('/health', async (ctx) => {
  const db = await getDbStatus();
  ctx.body = {
    status: 'ok',
    db,
    timestamp: new Date().toISOString(),
  };
});

export default router;
