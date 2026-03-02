import Router from 'koa-router';
import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';
import { config } from '@/config/index';

const router = new Router();

// Development helper: get a token for the built-in test_user
router.get('/dev/token', async (ctx) => {
  try {
    const session = `dev-${Date.now()}`;
    const payload = {
      userId: 1,
      userName: 'test_user',
      empId: 'DEV001',
      session,
    } as any;
    const token = jwt.sign(payload, (config as any).Backend.jwtSecret, { expiresIn: '1y' });
    ctx.body = { code: 200, message: 'OK', result: { token } };
  } catch (e: any) {
    ctx.status = 500;
    ctx.body = { code: 500, message: e.message };
  }
});

export default router;
