import { User, HistoryItem, Notification, Document } from './types';

export const CREDENTIALS = {
  user: {
    employeeId: '12345',
    password: 'qwerty12345',
    userData: {
      employeeId: 'user1234',
      name: 'Priyanka',
      department: 'Engineering',
      role: 'user' as const,
      lastLogin: new Date().toISOString(),
    },
  },
  admin: {
    employeeId: '1234',
    password: 'qwertyuiop1234567890',
    userData: {
      employeeId: 'admin1234',
      name: 'Harikrishnan',
      department: 'Human Resources',
      role: 'admin' as const,
      lastLogin: new Date().toISOString(),
    },
  },
};

export const MOCK_HISTORY: HistoryItem[] = [
  {
    id: '1',
    query: 'What is the annual leave policy?',
    answer:
      'Employees are entitled to 15 days of annual leave per year. Leave must be requested at least 2 weeks in advance. Unused leave can be carried forward up to 5 days. Leave approval is subject to manager discretion.',
    timestamp: new Date(Date.now() - 86400000 * 2),
    source: {
      document: 'HR_Policy_Manual_2024.pdf',
      page: 12,
    },
  },
  {
    id: '2',
    query: 'リモートワークポリシーについて教えてください',
    answer:
      'リモートワークは週に最大3日まで許可されています。事前にマネージャーの承認が必要です。自宅のインターネット環境が安定していることを確認してください。セキュリティポリシーを遵守する必要があります。',
    timestamp: new Date(Date.now() - 86400000 * 5),
    source: {
      document: 'Remote_Work_Guidelines_JP.pdf',
      page: 3,
    },
  },
  {
    id: '3',
    query: 'How do I submit expense reports?',
    answer:
      'Expense reports must be submitted within 30 days of the expense date. Use the online portal to upload receipts and fill out the expense form. Manager approval is required for expenses over $500. Reimbursement is processed within 10 business days.',
    timestamp: new Date(Date.now() - 86400000 * 7),
    source: {
      document: 'Finance_Procedures.pdf',
      page: 8,
    },
  },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Policy Update',
    message:
      'The remote work policy has been updated. Please review the new guidelines.',
    timestamp: new Date(Date.now() - 3600000),
    read: false,
    type: 'update',
  },
  {
    id: '2',
    title: 'System Announcement',
    message: 'Scheduled maintenance on Saturday, 2 AM - 4 AM.',
    timestamp: new Date(Date.now() - 7200000),
    read: false,
    type: 'announcement',
  },
  {
    id: '3',
    title: 'Document Processing',
    message: 'New HR policy document has been successfully indexed.',
    timestamp: new Date(Date.now() - 86400000),
    read: true,
    type: 'processing',
  },
];

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: '1',
    name: 'HR_Policy_Manual_2024.pdf',
    version: '2.1',
    uploadedBy: 'admin1234',
    uploadedAt: new Date(Date.now() - 86400000 * 30),
    status: 'active',
  },
  {
    id: '2',
    name: 'Remote_Work_Guidelines_JP.pdf',
    version: '1.5',
    uploadedBy: 'admin1234',
    uploadedAt: new Date(Date.now() - 86400000 * 15),
    status: 'active',
  },
  {
    id: '3',
    name: 'Finance_Procedures.pdf',
    version: '3.0',
    uploadedBy: 'admin1234',
    uploadedAt: new Date(Date.now() - 86400000 * 45),
    status: 'active',
  },
];
