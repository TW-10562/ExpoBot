import IndexCon from '@/controller';
import { useFilePermission } from '@/controller/auth';
import { deleteFile, deleteFileById, listFiles, uploadFile, updateFileInfo, addNewTag, editTag, deleteTag, listTags, previewFile, downloadFile, extractTextFromFile} from '@/controller/file';
import File from '@/mysql/model/file.model';
import Router from 'koa-router';

const router = new Router({ prefix: '/api/files' });

// Specific routes first
router.post('/upload', uploadFile, IndexCon());
router.post('/addNewTag', addNewTag, IndexCon());
router.post('/extract-text', extractTextFromFile, IndexCon());

// GET routes
router.get('/', listFiles, IndexCon());
router.get('/tags', listTags, IndexCon());
router.get(
  '/preview/:storage_key',
  useFilePermission(async (ctx) => {
    const record = await File.findOne({
      raw: true,
      attributes: ['id'],
      where: { storage_key: ctx.params.storage_key },
    }) as unknown as { id: number } | null;
    return record?.id;
  }),
  previewFile,
);
router.get(
  '/download/:storage_key',
  useFilePermission(async (ctx) => {
    const record = await File.findOne({
      raw: true,
      attributes: ['id'],
      where: { storage_key: ctx.params.storage_key },
    }) as unknown as { id: number } | null;
    return record?.id;
  }),
  downloadFile,
);

// DELETE routes - specific first, then general param
router.delete('/delete', useFilePermission('ids'), deleteFile, IndexCon()); // DELETE /api/files/delete with body
router.delete('/:id', useFilePermission('id'), deleteFileById, IndexCon()); // DELETE /api/files/:id (file deletion)

// PUT routes
router.put('/', useFilePermission('id'), updateFileInfo, IndexCon());
router.put('/editTag', editTag, IndexCon());

export default router;
