import { Context, Next } from 'koa';

const isStreamResponse = (ctx: Context): boolean => {
  if ((ctx.state as any)?.skipResponseFormat) {
    return true;
  }
  const contentType = ctx.response.get('Content-Type') || '';
  return contentType.includes('text/event-stream');
};

const normalizeExistingBody = (ctx: Context) => {
  const body = ctx.body as Record<string, any>;
  if (typeof body !== 'object' || body === null) {
    return;
  }

  if (!('code' in body)) {
    return;
  }

  const msg = body.msg ?? body.message ?? (ctx.status >= 400 ? 'Error' : 'OK');
  const data = body.data ?? body.result ?? null;

  body.msg = msg;
  body.data = data;
  if (!('message' in body)) body.message = msg;
  if (!('result' in body)) body.result = data;
  if (!('timestamp' in body)) body.timestamp = new Date().toISOString();
  ctx.body = body;
};

export const responseFormatterMiddleware = async (ctx: Context, next: Next) => {
  await next();

  if (isStreamResponse(ctx)) {
    return;
  }

  normalizeExistingBody(ctx);
  if ((ctx.body as any)?.code !== undefined) {
    return;
  }

  const statusCode = ctx.status && ctx.status !== 404 ? ctx.status : 200;
  const msg = statusCode >= 400 ? 'Error' : 'OK';
  const data = ctx.body ?? null;

  ctx.body = {
    code: statusCode,
    msg,
    data,
    message: msg,
    result: data,
    timestamp: new Date().toISOString(),
  };
};

export default responseFormatterMiddleware;
