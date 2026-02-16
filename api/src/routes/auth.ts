/**
 * Authentication Routes - Legacy user-based authentication
 * Provides login, logout, register, password reset functionality
 */

import Router from 'koa-router';
import IndexCon from '@/controller';
import {
  authCallback,
  authExchange,
  createUser,
  delUser,
  getAllUsers,
  getUserBase,
  getUserGroups,
  login,
  loginVal,
  logout,
  putUserStatus,
  putUserPassword,
  queryUserInfo,
  updateUser,
} from '@/controller/user';
import { judgeIdSchema, userSchema } from '@/schemas/user';

const router = new Router({ prefix: '/auth' });

// Legacy user routes (kept for backward compatibility)
const userRouter = new Router({ prefix: '/user' });

userRouter.post('/login', userSchema, loginVal, getUserBase, login, IndexCon('ログイン成功しました'));
userRouter.delete('/logout', logout, IndexCon('アカウントを退出しました'));
userRouter.get('/getInfo', queryUserInfo, IndexCon('ユーザーの個人情報を取得成功しました'));
userRouter.get('/list', getAllUsers, IndexCon('ユーザー一覧を取得成功しました'));
userRouter.post('/create', createUser, IndexCon('ユーザーを作成成功しました'));
userRouter.put('/update', updateUser, IndexCon('ユーザーを更新成功しました'));
userRouter.delete('/:id', judgeIdSchema(), delUser, IndexCon('ユーザーを削除成功しました'));
userRouter.put('/profile', putUserStatus, IndexCon('ユーザーのステータスを更新成功しました'));
userRouter.put('/password', putUserPassword, IndexCon('ユーザーのパスワードを更新成功しました'));
userRouter.get('/:userId/groups', getUserGroups, IndexCon('ユーザーグループを取得成功しました'));
userRouter.get('/auth/callback', authCallback, IndexCon('認証コールバック成功しました'));
userRouter.get('/auth/exchange', authExchange, IndexCon('認証エクスチェンジ成功しました'));

export { router, userRouter };
const combinedRouter = new Router();
combinedRouter.use(router.routes(), router.allowedMethods());
combinedRouter.use(userRouter.routes(), userRouter.allowedMethods());

export default combinedRouter;
