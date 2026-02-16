import Router from 'koa-router';
import { healthCheckService } from '@/services/healthCheck';

const router = new Router({ prefix: '/api' });

router.get('/health', async (ctx) => {
  const health = await healthCheckService.getQuickHealth();
  ctx.body = {
    status: health.status,
    uptime: health.uptime,
    timestamp: new Date().toISOString(),
  };
});

export default router;
