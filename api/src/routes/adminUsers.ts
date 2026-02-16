import IndexCon from '@/controller';
import Router from 'koa-router';
import {
  createAdminUserController,
  deleteAdminUserController,
  getAdminUsers,
  importAdminUsersCsvController,
  updateAdminUserController,
} from '@/controller/adminUser';
import { requireAdmin } from '@/controller/auth';

const router = new Router({ prefix: '/api/admin/users' });

router.get('/', requireAdmin, getAdminUsers, IndexCon());
router.post('/', requireAdmin, createAdminUserController, IndexCon('ユーザーを作成しました'));
router.put('/:userId', requireAdmin, updateAdminUserController, IndexCon('ユーザーを更新しました'));
router.delete('/:userId', requireAdmin, deleteAdminUserController, IndexCon('ユーザーを削除しました'));
router.post('/import-csv', requireAdmin, importAdminUsersCsvController, IndexCon('CSV 取込完了'));

export default router;
