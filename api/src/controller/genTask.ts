import { put, queryPage, queryList } from '@/utils/mapper';
import KrdGenTask from '@/mysql/model/gen_task.model';
import KrdGenTaskOutput from '@/mysql/model/gen_task_output.model';
import KrdFile from '@/mysql/model/file.model';
import { userType } from '@/types';
import {
  IGenTask,
  IGenTaskQuerySerType,
  IGenTaskQueryType,
  IGenTaskSer,
} from '@/types/genTask';
import {
  IGenTaskOutputQuerySerType,
  IGenTaskOutputQueryType,
  IGenTaskOutputReNameSer,
  IGenTaskOutputSer,
} from '@/types/genTaskOutput';
import { Context } from 'koa';
import { Op } from 'sequelize';
import fetch from 'node-fetch';

import { queryConditionsData } from '@/service';
import { handleAddGenTask } from '@/service/genTaskService';

const RAG_BACKEND_URL = process.env.RAG_BACKEND_URL || 'http://localhost:8010';

export const getAddMid = async (ctx: any, next: () => Promise<void>) => {
  try {
    const userId = ctx.state.user?.userId;
    const userName = ctx.state.user?.userName || 'anonymous';
    const addContent = ctx.request.body as IGenTask;

    const chatFormData = addContent.formData as any;
    const userQuery = chatFormData?.prompt?.trim();

    // ---------- EMPTY CHAT CREATION ----------
    if (addContent.type === 'CHAT' && (!userQuery || userQuery.length === 0)) {
      const result = await handleAddGenTask(addContent, userName);
      ctx.state.formatData = { taskId: result.taskId };
      return await next();
    }

    // ---------- REAL RAG SEARCH ----------
    let ragText = '';
    let usedFiles: any[] = [];

    try {
      const ragRes = await fetch(`${RAG_BACKEND_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userQuery,
          top_k: 5,
        }),
      });

      if (ragRes.ok) {
        const ragJson: any = await ragRes.json();

        ragText = ragJson?.chunks
          ?.map(
            (c: any, i: number) =>
              `【資料${i + 1}】\n${c.text}\n`,
          )
          .join('\n');

        usedFiles = ragJson?.chunks?.map((c: any) => ({
          fileId: c.file_id,
          page: c.page,
        })) || [];
      }
    } catch (e) {
      console.error('[RAG] backend error:', e);
    }

    // ---------- BUILD FINAL PROMPT ----------
    const finalPrompt = ragText
      ? `${userQuery}

以下は社内文書からの参考情報です。
これらの内容を必ず根拠として回答してください。

${ragText}
`
      : userQuery;

    const enhancedContent: IGenTask = {
      ...addContent,
      formData: {
        ...chatFormData,
        prompt: finalPrompt,
        ragUsed: Boolean(ragText),
        usedFiles,
      },
    };

    const result = await handleAddGenTask(enhancedContent, userName);

    ctx.state.formatData = {
      taskId: result.taskId,
      ragUsed: Boolean(ragText),
      usedFiles,
    };

    await next();
  } catch (error) {
    console.error('[GenTask] ERROR:', error);
    return ctx.app.emit(
      'error',
      { code: '400', message: 'チャット生成に失敗しました' },
      ctx,
    );
  }
};

// --- Lightweight stubs for other genTask route handlers ---
// These provide minimal behavior so routes compile and run.
export const getListMid = async (ctx: Context, next: () => Promise<void>) => {
  ctx.state.formatData = { count: 0, rows: [] };
  await next();
};

export const getOutputListMid = async (ctx: Context, next: () => Promise<void>) => {
  ctx.state.formatData = { count: 0, rows: [] };
  await next();
};

export const updateTaskOutputMid = async (ctx: Context, next: () => Promise<void>) => {
  // No-op update wrapper
  await next();
};

export const reNameTaskOutputMid = async (ctx: Context, next: () => Promise<void>) => {
  await next();
};

export const deleteTaskOutputMid = async (ctx: Context, next: () => Promise<void>) => {
  await next();
};

export const stopTaskOutputMid = async (ctx: Context, next: () => Promise<void>) => {
  await next();
};

export const getChatTitleMid = async (ctx: Context, next: () => Promise<void>) => {
  ctx.state.formatData = { title: 'Chat' };
  await next();
};

export const sendFeedbackToCache = async (ctx: Context, next: () => Promise<void>) => {
  // Accept feedback but do nothing for now.
  await next();
};

export const translateContentOnDemandMid = async (ctx: Context, next: () => Promise<void>) => {
  // For now, indicate translation not implemented.
  ctx.state.formatData = { translated: null };
  await next();
};
