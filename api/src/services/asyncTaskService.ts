import { addJob } from '@/queue/jobQueue';
import redis from '@/clients/redis';
import { nanoid } from 'nanoid';

const TASK_KEY_PREFIX = 'async_task:';

export type AsyncTaskStatus = 'QUEUED' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export type AsyncTaskRecord = {
  id: string;
  type: string;
  status: AsyncTaskStatus;
  payload: Record<string, unknown>;
  result?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

const taskKey = (id: string) => `${TASK_KEY_PREFIX}${id}`;

export const saveTaskRecord = async (record: AsyncTaskRecord) => {
  await redis.set(taskKey(record.id), JSON.stringify(record));
  await redis.expire(taskKey(record.id), 60 * 60 * 24);
};

export const getTaskRecord = async (id: string): Promise<AsyncTaskRecord | null> => {
  const raw = await redis.get(taskKey(id));
  return raw ? (JSON.parse(raw) as AsyncTaskRecord) : null;
};

export const createAsyncTask = async (
  type: string,
  payload: Record<string, unknown>,
): Promise<AsyncTaskRecord> => {
  const now = new Date().toISOString();
  const task: AsyncTaskRecord = {
    id: nanoid(),
    type,
    payload,
    status: 'QUEUED',
    createdAt: now,
    updatedAt: now,
  };

  await saveTaskRecord(task);
  await addJob('aviaryAsyncTask', { taskId: task.id, type, payload }, { removeOnComplete: 1000 });

  return task;
};

export const updateAsyncTask = async (
  taskId: string,
  patch: Partial<Pick<AsyncTaskRecord, 'status' | 'result' | 'error'>>,
): Promise<AsyncTaskRecord | null> => {
  const existing = await getTaskRecord(taskId);
  if (!existing) {
    return null;
  }

  const updated: AsyncTaskRecord = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await saveTaskRecord(updated);
  return updated;
};
