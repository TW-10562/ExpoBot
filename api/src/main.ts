import cors from '@koa/cors';
import dayjs from 'dayjs';
import { createServer } from 'http';
import Koa from 'koa';
import KoaBody from 'koa-body';
import koaStatic from 'koa-static';
import userAgent from 'koa-useragent';
import path from 'path';

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
    .use(router.routes())
    .use(router.allowedMethods());

  app.on('error', errHandlerFn);

  const httpServer = createServer(app.callback());

  // ✅ Allow PORT env override (so you can run PORT=8090 npm run dev safely)
  const port = Number(process.env.PORT ?? config.Backend.port);
  const host = config.Backend.host ?? '0.0.0.0';

  httpServer.listen(port, '0.0.0.0', () => {
    console.info(
      `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] 🚀 サーバーが正常に起動しました: ${host}:${port}`,
    );
    console.info(
      `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] 🌐 サーバーはすべてのネットワークインターフェースでリッスンしています (0.0.0.0:${port})`,
    );
  });

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
