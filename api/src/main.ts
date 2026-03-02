import cors from '@koa/cors';
import dayjs from 'dayjs';
import { createServer } from 'http';
import Koa from 'koa';
import KoaBody from 'koa-body';
import koaStatic from 'koa-static';
import userAgent from 'koa-useragent';
import path from 'path';
import Router from 'koa-router';

import { config } from '@/config';
import { auth } from '@/controller/auth';
import { previewFile } from '@/controller/file';
import initDB from '@/mysql/db';
import { initRoutes } from '@/routes'; // ✅ IMPORTANT: use initRoutes (async)
import { detectDbMode } from '@/db/adapter';
import errHandlerFn from '@/utils/errHandler';
import { initializeZSet } from '@/utils/redis';

import { createBullBoard } from 'bull-board';
import { BullAdapter } from 'bull-board/bullAdapter';
import { jobQueue } from './queue/jobQueue';

import express from 'express';

// register repeatable jobs
import { registerRepeatJobs } from './scheduler/repeatJobs';

const STATIC_DIR = path.resolve(__dirname, '../../');

async function bootstrap() {
  const app = new Koa();

  await initDB();
  const dbMode = await detectDbMode();
  console.info(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] DB mode: ${dbMode}`);

  // Initialize Redis with Ollama URLs
  initializeZSet().catch((error) => {
    console.error('Failed to initialize ZSet:', error);
  });

  // ✅ Ensure ALL routes are loaded before server starts
  const router = await initRoutes();

  // WRAP existing routes with /api prefix
  const apiRouter = new Router({ prefix: '/api' });
  apiRouter.use(router.routes());
  apiRouter.use(router.allowedMethods());

  // Existing preview route registration
  router.get('/api/file/preview/:id', previewFile);

  // job queue and bull board setup
  const bullApp = express();
  const { router: bullRouter } = createBullBoard([new BullAdapter(jobQueue)]);
  bullApp.use('/', bullRouter);

  bullApp.listen(9999, () => {
    console.log('Bull Board: http://localhost:9999');
  });

  // register repeatable jobs
  registerRepeatJobs();

  app
    .use(cors())
    .use(
      KoaBody({
        multipart: true,
        formidable: {
          uploadDir: config.RAG.Uploads.filesDir,
          maxFileSize: config.RAG.Uploads.maxFileSize,
          keepExtensions: config.RAG.Uploads.keepExtensions,
        },
        parsedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
      }),
    )
    .use(koaStatic(STATIC_DIR))
    .use(koaStatic(config.RAG.Uploads.filesDir))
    .use(auth)
    .use(userAgent)
    .use(apiRouter.routes())
    .use(apiRouter.allowedMethods())
    .use(router.routes())
    .use(router.allowedMethods());

  app.on('error', errHandlerFn);

  const httpServer = createServer(app.callback());

  // ✅ Allow PORT env override (so you can run PORT=8090 npm run dev safely)
  const port = Number(process.env.PORT ?? config.Backend.port);
  const host = config.Backend.host ?? '0.0.0.0';

  // Try to listen on configured port; if port is in use, attempt a small range of fallback ports
  let attemptPort = port;
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await new Promise<void>((resolve, reject) => {
        httpServer.once('error', (err: any) => reject(err));
        httpServer.listen(attemptPort, '0.0.0.0', () => resolve());
      });
      console.info(
        `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] 🚀 サーバーが正常に起動しました: ${host}:${attemptPort}`,
      );
      console.info(
        `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] 🌐 サーバーはすべてのネットワークインターフェースでリッスンしています (0.0.0.0:${attemptPort})`,
      );
      break;
    } catch (err: any) {
      if (err?.code === 'EADDRINUSE') {
        console.warn(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] ポート ${attemptPort} は既に使用されています、${attempt + 1} 回目の再試行...`);
        attemptPort += 1; // try next port
        continue;
      }
      throw err;
    }
  }

  process.on('uncaughtException', (err) => {
    console.error(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] ❌ 未捕获の例外: ${err.message}`);
  });

  process.on('unhandledRejection', (reason: any) => {
    console.error(
      `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] ❌ 未処理のプロミス拒否: ${String(reason)}`,
    );
  });
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
