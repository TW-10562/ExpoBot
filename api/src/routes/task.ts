import Router from 'koa-router';
import { Context } from 'koa';
import { createAsyncTask, getTaskRecord } from '@/services/asyncTaskService';

const router = new Router({ prefix: '/api/task' });

router.post('/', async (ctx: Context) => {
  const body = (ctx.request.body || {}) as Record<string, unknown>;
  const type = String(body.type || '').trim().toUpperCase();
  if (!type) {
    ctx.status = 400;
    ctx.body = { code: 400, msg: 'type is required', data: null };
    return;
  }

  const payload =
    body.payload && typeof body.payload === 'object'
      ? (body.payload as Record<string, unknown>)
      : body;

  const task = await createAsyncTask(type, payload);
  ctx.status = 202;
  ctx.body = {
    code: 202,
    msg: 'Task queued',
    data: {
      id: task.id,
      status: task.status,
      type: task.type,
      createdAt: task.createdAt,
    },
  };
});

router.get('/:id', async (ctx: Context) => {
  const task = await getTaskRecord(ctx.params.id);
  if (!task) {
    ctx.status = 404;
    ctx.body = { code: 404, msg: 'Task not found', data: null };
    return;
  }

  ctx.body = {
    code: 200,
    msg: 'OK',
    data: task,
  };
});

export default router;
