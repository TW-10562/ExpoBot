import Router from 'koa-router';
import { Context } from 'koa';
import { aiGateway, AIGatewayMessage } from '@/services/aiGateway';

const router = new Router({ prefix: '/api/chat' });

const buildMessages = (payload: any): AIGatewayMessage[] => {
  if (Array.isArray(payload?.messages) && payload.messages.length > 0) {
    return payload.messages
      .filter((item: any) => item && typeof item.content === 'string' && item.content.trim().length > 0)
      .map((item: any) => ({
        role: item.role as 'system' | 'user' | 'assistant',
        content: item.content,
      }));
  }

  if (typeof payload?.prompt === 'string' && payload.prompt.trim().length > 0) {
    return [{ role: 'user', content: payload.prompt }];
  }

  return [];
};

router.post('/stream', async (ctx: Context) => {
  const payload = ctx.request.body as any;
  const messages = buildMessages(payload);
  if (messages.length === 0) {
    ctx.status = 400;
    ctx.body = { code: 400, msg: 'messages or prompt is required', data: null };
    return;
  }

  (ctx.state as any).skipResponseFormat = true;
  ctx.status = 200;
  ctx.set('Content-Type', 'text/event-stream; charset=utf-8');
  ctx.set('Cache-Control', 'no-cache, no-transform');
  ctx.set('Connection', 'keep-alive');
  ctx.set('X-Accel-Buffering', 'no');

  ctx.res.write(': connected\n\n');
  ctx.respond = false;

  try {
    await aiGateway.streamChat(
      messages,
      async (token) => {
        ctx.res.write(`data: ${JSON.stringify({ token })}\n\n`);
      },
      {
        model: payload?.model,
        temperature: payload?.temperature,
        maxTokens: payload?.maxTokens,
      },
    );

    ctx.res.write('data: [DONE]\n\n');
    ctx.res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'stream failed';
    ctx.res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
    ctx.res.end();
  }
});

export default router;
