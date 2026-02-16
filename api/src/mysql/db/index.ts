import seq from './seq.db';
import dayjs from 'dayjs';
import { initNotification } from '../model/notification.model';
import { initSupportTicket } from '../model/support_ticket.model';
import { runPostgresMigrations } from '@/db/migrate';

const initDB = async () => {
  try {
    await runPostgresMigrations();
    await seq.authenticate();
    console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] 🚀 PostgreSQLデータベース接続が成功しました`);

    initNotification(seq);
    initSupportTicket(seq);

    await seq.sync();
  } catch (error) {
    console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] PostgreSQLデータベース接続に失敗しました`, error);
  }

  process.on('unhandledRejection', (error) => {
    console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] PostgreSQLデータベース接続に失敗しました`, error);
  });
};

export default initDB;
