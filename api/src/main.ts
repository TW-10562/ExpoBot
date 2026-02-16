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
import { auditLogMiddleware } from '@/middleware/auditLog';
import { responseFormatterMiddleware } from '@/middleware/responseFormatter';
import initDB from '@/mysql/db';
import router from '@/routes';
import errHandlerFn from '@/utils/errHandler';
import { initializeZSet } from '@/utils/redis';
import { createBullBoard } from 'bull-board';
import { BullAdapter } from 'bull-board/bullAdapter';
import { jobQueue } from './queue/jobQueue';
import { authMiddleware, departmentScope } from './middleware/rbacMiddleware';
import { healthCheckService } from './services/healthCheck';

import express from 'express';

const STATIC_DIR = path.resolve(__dirname, '../../');

const app = new Koa();

initDB();
// Initialize Redis with Ollama URLs
initializeZSet().catch(error => {
  console.error('Failed to initialize ZSet:', error);
});

router.get('/api/file/preview/:id', previewFile);

// job queue and bull board setup
const bullApp = express();
const { router: bullRouter } = createBullBoard([new BullAdapter(jobQueue)]);
bullApp.use('/', bullRouter);

bullApp.listen(9999, () => {
  console.log('Bull Board: http://localhost:9999');
});

// register repeatable jobs
import { registerRepeatJobs } from './scheduler/repeatJobs';
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
  // Add RBAC middleware for authentication
  .use(authMiddleware)
  // Add department scope middleware
  .use(departmentScope)
  // Add audit logging middleware
  .use(auditLogMiddleware)
  // Add response format middleware
  .use(responseFormatterMiddleware)
  .use(router.routes())
  .use(router.allowedMethods());

app.on('error', errHandlerFn);

const httpServer = createServer(app.callback());

httpServer.listen(config.Backend.port, '0.0.0.0', () => {
  healthCheckService.startPeriodicChecks(60_000);
  console.info(
    `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] 🚀 サーバーが正常に起動しました: ${config.Backend.host}:${config.Backend.port}`,
  );
  console.info(
    `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] 🌐 サーバーはすべてのネットワークインターフェースでリッスンしています (0.0.0.0:${config.Backend.port})`,
  );
  console.info(
    `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] 🔐 RBAC認証とアクセス制御が有効になっています`,
  );
  console.info(
    `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] 🤖 AI Gateway (Ollama) endpoints: ${(process.env.OLLAMA_BASE_URL || config.Ollama.url.join(', '))}`,
  );
  console.info(
    `[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] ✅ Health endpoint: http://${config.Backend.host}:${config.Backend.port}/api/health`,
  );
});

process.on('uncaughtException', (err) => {
  console.error(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] ❌ 未捕获の例外: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
  console.error(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] ❌ 未処理のプロミス拒否: ${reason}`);
});
