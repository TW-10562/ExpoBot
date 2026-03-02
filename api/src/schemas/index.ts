import Joi from 'joi';
import { Context } from 'koa';

export const addEditSchema = (judge: Joi.ObjectSchema<any>) => async (ctx: Context, next: () => Promise<void>) => {
  try {
    const list = (ctx.request as any).body;
    try {
      const preview = typeof list === 'object' ? JSON.stringify(list).slice(0, 1000) : String(list);
      console.error('[addEditSchema] body type:', typeof list, 'isArray:', Array.isArray(list), 'preview:', preview);
    } catch (e) {
      console.error('[addEditSchema] body preview failed', e);
    }
    // If frontend sends `formData` as a JSON string, attempt to parse it for validation
    if (list && typeof list === 'object' && typeof list.formData === 'string') {
      try {
        ((ctx.request as any).body as any).formData = JSON.parse(list.formData);
      } catch (e) {
        // leave as-is; validation will fail and return 400
      }
    }
    await judge.validateAsync((ctx.request as any).body);

    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      {
        code: '400',
        message: 'アップロードパラメータを確認してください',
      },
      ctx,
    );
  }
};

export const judgeIdSchema = () => async (ctx: Context, next: () => Promise<void>) => {
  try {
    const list = ctx.request.path.split('/');
    const ids = list[list.length - 1];
    const idsList = ids.split(',');

    ctx.state.ids = idsList;
  } catch (error) {
    console.error((ctx.request as any).body);
    return ctx.app.emit('error', {
      code: '400',
      message: 'IDのフォーマットが間違っています',
    }, ctx);
  }
  await next();
};
