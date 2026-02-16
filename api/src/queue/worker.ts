import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { handleAddGenTask } from '../service/genTaskService';
import { jobQueue } from './jobQueue';
import { IFileQuerySerType } from '@/types/file';
import { queryPage } from '@/utils/mapper';
import Tag from '@/mysql/model/file_tag.model';
import { postNewTag } from '@/service/file';
import { aiGateway } from '@/services/aiGateway';
import { getTaskRecord, updateAsyncTask } from '@/services/asyncTaskService';

// count login job
jobQueue.process('countLoginJob', async (job) => {
  console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] Count login job started with data:`, job.data);

  // TODO: implement the actual logic
});

// say hello job
jobQueue.process('sayHelloJob', async (job) => {
  console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] Hello, ${job.data.name}!`);
  // TODO: implement the actual logic
});

// file upload job
jobQueue.process('fileUploadJob', async (job) => {
  console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] File upload job started with data:`, job.data);
  const data = job.data;
  const folderpath = data.folderpath;

  try {
    type UploadFileInfo = {
      size: number;
      filepath: string;
      newFilename: string;
      mimetype: string;
      mtime: string;
      originalFilename: string;
    };

    async function collectFilesRecursively(
      dir: string,
      baseDir: string,
    ): Promise<UploadFileInfo[]> {
      const result: UploadFileInfo[] = [];
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const childFiles = await collectFilesRecursively(fullPath, baseDir);
          result.push(...childFiles);
          continue;
        }

        if (!entry.isFile()) continue;

        const stats = await fs.promises.stat(fullPath);
        const relativePath = path.relative(baseDir, fullPath);
        const mimeType = mime.lookup(fullPath) || 'application/octet-stream';

        result.push({
          size: stats.size,
          filepath: fullPath,
          newFilename: relativePath,
          mimetype: mimeType,
          mtime: stats.mtime.toISOString(),
          originalFilename: relativePath,
        });
      }
      return result;
    }

    type QueryWithOrder = IFileQuerySerType & {
      order?: [string, 'ASC' | 'DESC'][];
    };
    const res = await queryPage<QueryWithOrder>(Tag, {
      pageNum: 1,
      pageSize: Number.MAX_SAFE_INTEGER,
      order: [['created_at', 'ASC']],
    });

    const rows = res.rows as any[];
    const tagMap = new Map<string, string>(
      rows.map((t) => [t.get('name') as string, t.get('id') as string]),
    );

    const basePath = path.isAbsolute(folderpath) ? folderpath : path.resolve(process.cwd(), folderpath);
    const entries = await fs.promises.readdir(basePath, { withFileTypes: true });

    const tasks = entries.map(async (entry) => {
      try {
        console.log(`Entry: ${entry.name}, isDirectory: ${entry.isDirectory()}, isFile: ${entry.isFile()}`);

        if (entry.isDirectory()) {
          let tagId = tagMap.get(entry.name) ?? null;

          if (!tagId) {
            const createdTag = await postNewTag({ name: entry.name });
            tagId = createdTag.id;
            tagMap.set(entry.name, tagId);
          }

          const dirPath = path.join(basePath, entry.name);
          const fileList = await collectFilesRecursively(dirPath, basePath);

          if (fileList.length === 0) {
            console.log(`No files found in directory: ${entry.name}`);
            return;
          }

          await handleAddGenTask(
            {
              type: 'FILEUPLOAD',
              formData: {
                files: fileList,
                tags: [tagId],
                userName: 'system',
              },
            },
            'system',
          );
          return;
        }

        if (entry.isFile()) {
          const filePath = path.join(basePath, entry.name);
          const stats = await fs.promises.stat(filePath);

          const mimeType = mime.lookup(filePath) || 'application/octet-stream';

          const fileList: UploadFileInfo[] = [
            {
              size: stats.size,
              filepath: filePath,
              newFilename: entry.name,
              mimetype: mimeType,
              mtime: stats.mtime.toISOString(),
              originalFilename: entry.name,
            },
          ];

          await handleAddGenTask(
            {
              type: 'FILEUPLOAD',
              formData: {
                files: fileList,
                tags: [],
                userName: 'system',
              },
            },
            'system',
          );
        }
      } catch (error) {
        console.error(`Error processing entry ${entry.name}:`, error);
      }
    });

    await Promise.all(tasks);

  } catch (error) {
    console.error('Error processing file upload job:', error);
  }
});

jobQueue.process('aviaryAsyncTask', async (job) => {
  const { taskId, type, payload } = job.data as {
    taskId: string;
    type: string;
    payload: Record<string, any>;
  };

  const existing = await getTaskRecord(taskId);
  if (!existing) {
    return;
  }

  await updateAsyncTask(taskId, { status: 'PROCESSING' });

  try {
    if (type === 'CHAT') {
      const prompt = String(payload.prompt || payload.message || '').trim();
      if (!prompt) {
        throw new Error('CHAT payload.prompt is required');
      }

      const content = await aiGateway.chat([{ role: 'user', content: prompt }], {
        model: payload.model,
        temperature: payload.temperature,
        maxTokens: payload.maxTokens,
      });

      await updateAsyncTask(taskId, {
        status: 'SUCCESS',
        result: {
          content,
        },
      });
      return;
    }

    // Generic passthrough for unsupported task types.
    await updateAsyncTask(taskId, {
      status: 'SUCCESS',
      result: {
        message: `Task type ${type} completed`,
        payload,
      },
    });
  } catch (error) {
    await updateAsyncTask(taskId, {
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Unknown task error',
    });
  }
});

jobQueue.on('completed', (job) => {
  console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] Job ${job.name} completed`);
});

jobQueue.on('failed', (job, err) => {
  console.error(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] Job ${job.name} failed:`, err);
});
