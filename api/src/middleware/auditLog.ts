import { Context, Next } from 'koa';
import { logAuditAction } from '@/service/auditService';

const shouldSkipAudit = (ctx: Context): boolean => {
  return ctx.path.startsWith('/api/health');
};

const trimString = (value: unknown, maxLen = 500): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.length > maxLen ? `${value.slice(0, maxLen)}...` : value;
};

const sanitizePayload = (payload: unknown): unknown => {
  if (!payload || typeof payload !== 'object') {
    return trimString(payload);
  }

  if (Array.isArray(payload)) {
    return payload.slice(0, 20).map((item) => sanitizePayload(item));
  }

  const entries = Object.entries(payload as Record<string, unknown>).slice(0, 30);
  return Object.fromEntries(
    entries.map(([key, value]) => {
      if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
        return [key, '[REDACTED]'];
      }
      if (typeof value === 'object' && value !== null) {
        return [key, sanitizePayload(value)];
      }
      return [key, trimString(value)];
    }),
  );
};

export const auditLogMiddleware = async (ctx: Context, next: Next) => {
  const startedAt = Date.now();
  let caughtError: Error | null = null;

  try {
    await next();
  } catch (error) {
    caughtError = error as Error;
    throw error;
  } finally {
    if (shouldSkipAudit(ctx)) {
      return;
    }

    const userId = Number(ctx.state.user?.userId || ctx.userId || 0);
    const durationMs = Date.now() - startedAt;

    try {
      await logAuditAction({
        user_id: Number.isInteger(userId) && userId > 0 ? BigInt(userId) : undefined,
        action_type: caughtError ? 'API_REQUEST_FAILED' : 'API_REQUEST',
        resource_type: 'ROUTE',
        resource_id: `${ctx.method} ${ctx.path}`,
        department_id: Number(ctx.deptId || 0) || undefined,
        description: `${ctx.method} ${ctx.path} (${ctx.status || 500})`,
        details: {
          method: ctx.method,
          path: ctx.path,
          status: ctx.status || 500,
          durationMs,
          ip: ctx.ip,
          userAgent: ctx.get('user-agent'),
          query: sanitizePayload(ctx.query),
          requestBody: sanitizePayload(ctx.request.body),
          responseMeta:
            typeof ctx.body === 'object'
              ? sanitizePayload({
                  code: (ctx.body as any)?.code,
                  message: (ctx.body as any)?.msg || (ctx.body as any)?.message,
                })
              : undefined,
          error: caughtError?.message,
        },
        ip_address: ctx.ip,
        user_agent: ctx.get('user-agent'),
        status: caughtError || ctx.status >= 500 ? 'FAILED' : 'SUCCESS',
      });
    } catch (auditError) {
      console.error('[AuditLog] Failed to persist audit log:', auditError);
    }
  }
};

export default auditLogMiddleware;
