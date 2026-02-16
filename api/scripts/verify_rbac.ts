import fs from 'node:fs/promises';
import path from 'node:path';
import axios, { AxiosRequestConfig } from 'axios';
import { Pool } from 'pg';
import YAML from 'yaml';

type Check = {
  name: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED';
  detail: string;
};

type HttpResult = {
  status: number;
  body: any;
};

const projectRoot = path.resolve(__dirname, '../../');
const defaultConfigPath = path.join(projectRoot, 'config/default.yml');
const reportPath = path.join(projectRoot, 'RBAC_VERIFICATION_REPORT.md');

const redactToken = (v: string) => `${v.slice(0, 12)}...<redacted>`;
const snippet = (v: unknown, len = 220) => JSON.stringify(v).slice(0, len);

const REQUIRED_PG_TABLES = ['sys_user', 'sys_role', 'sys_menu', 'sys_user_role', 'sys_role_menu'];

async function loadConfig() {
  try {
    const yaml = await fs.readFile(defaultConfigPath, 'utf8');
    return YAML.parse(yaml);
  } catch {
    return null;
  }
}

async function http(config: AxiosRequestConfig): Promise<HttpResult> {
  const res = await axios({
    validateStatus: () => true,
    timeout: 10000,
    ...config,
  });
  return { status: res.status, body: res.data };
}

function buildPgPool() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    return new Pool({
      connectionString: databaseUrl,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 2_000,
    });
  }
  if (!process.env.PG_HOST && !process.env.PG_PORT && !process.env.PG_USER && !process.env.PG_DATABASE) {
    return null;
  }
  return new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: Number(process.env.PG_PORT || 5432),
    user: process.env.PG_USER || 'expobot',
    password: process.env.PG_PASSWORD || 'expobot_password_change_me',
    database: process.env.PG_DATABASE || 'expobot',
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 2_000,
  });
}

async function pgHasTables(pool: Pool, tables: string[]) {
  const res = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1)`,
    [tables],
  );
  const found = new Set(res.rows.map((r) => r.table_name));
  return tables.every((t) => found.has(t));
}

async function ensureFixtures(pool: Pool, adminId: number, testUserId: number) {
  await pool.query('BEGIN');
  try {
    const roleAdmin = await pool.query(
      `INSERT INTO sys_role (role_name, role_key, role_sort, status, del_flag, create_by, remark)
       VALUES ('admin','admin',0,'0','0','system','seed')
       ON CONFLICT (role_key) DO UPDATE SET role_key=EXCLUDED.role_key
       RETURNING role_id`,
    );
    const adminRoleId = roleAdmin.rows[0]?.role_id;

    const roleViewer = await pool.query(
      `INSERT INTO sys_role (role_name, role_key, role_sort, status, del_flag, create_by, remark)
       VALUES ('viewer','viewer',100,'0','0','system','fixture')
       ON CONFLICT (role_key) DO UPDATE SET role_key=EXCLUDED.role_key
       RETURNING role_id`,
    );
    const viewerRoleId = roleViewer.rows[0]?.role_id;

    const menu = await pool.query(
      `INSERT INTO sys_menu (menu_name, parent_id, order_num, path, component, query, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, update_by, remark)
       VALUES ('UserReadFixture',0,999,'/qa/user-read','qa/user-read','', '1','0','C','0','0','R|user','bug','qa','qa','qa fixture')
       ON CONFLICT (perms) DO UPDATE SET perms=EXCLUDED.perms
       RETURNING menu_id`,
    );
    const menuId = menu.rows[0]?.menu_id;

    await pool.query(
      `INSERT INTO sys_user (user_id, user_name, password, status, sso_bound)
       VALUES ($1, 'admin', 'placeholder', '1', 0)
       ON CONFLICT (user_id) DO UPDATE SET user_name=EXCLUDED.user_name`,
      [adminId],
    );
    await pool.query(
      `INSERT INTO sys_user (user_id, user_name, password, status, sso_bound)
       VALUES ($1, 'testuser', 'placeholder', '1', 0)
       ON CONFLICT (user_id) DO UPDATE SET user_name=EXCLUDED.user_name`,
      [testUserId],
    );

    await pool.query(
      `INSERT INTO sys_role_menu (role_id, menu_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [viewerRoleId, menuId],
    );

    await pool.query(
      `INSERT INTO sys_user_role (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [testUserId, viewerRoleId],
    );

    await pool.query('COMMIT');
    return { adminRoleId, viewerRoleId, menuId };
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
}

async function main() {
  const cfg = await loadConfig();
  const baseUrl = cfg?.Backend?.host && cfg?.Backend?.port
    ? `http://${cfg.Backend.host}:${cfg.Backend.port}`
    : 'http://localhost:9090';

  const checks: Check[] = [];

  const health = await http({ url: `${baseUrl}/health`, method: 'GET' });
  checks.push({
    name: 'Health endpoint',
    status: health.status === 200 ? 'PASS' : 'FAIL',
    detail: `GET /health -> ${health.status}`,
  });

  const adminLogin = await http({
    url: `${baseUrl}/user/login`,
    method: 'POST',
    data: { userName: 'admin', password: '12345' },
  });
  const testLogin = await http({
    url: `${baseUrl}/user/login`,
    method: 'POST',
    data: { userName: 'testuser', password: 'test123' },
  });

  const adminToken = adminLogin.body?.result?.token as string;
  const testToken = testLogin.body?.result?.token as string;

  checks.push({
    name: 'Admin login',
    status: adminLogin.status === 200 ? 'PASS' : 'FAIL',
    detail: `POST /user/login -> ${adminLogin.status}`,
  });
  checks.push({
    name: 'Testuser login',
    status: testLogin.status === 200 ? 'PASS' : 'FAIL',
    detail: `POST /user/login -> ${testLogin.status}`,
  });

  const adminInfo = await http({
    url: `${baseUrl}/user/getInfo`,
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const testInfo = await http({
    url: `${baseUrl}/user/getInfo`,
    method: 'GET',
    headers: { Authorization: `Bearer ${testToken}` },
  });

  const adminId = adminInfo.body?.result?.userInfo?.userId ?? adminInfo.body?.result?.userInfo?.user_id;
  const testUserId = testInfo.body?.result?.userInfo?.userId ?? testInfo.body?.result?.userInfo?.user_id;

  const pgPool = buildPgPool();
  if (!pgPool) {
    checks.push({
      name: 'Postgres configured',
      status: 'BLOCKED',
      detail: 'PG env not set (PG_HOST/PG_PORT/PG_USER/PG_DATABASE or DATABASE_URL missing)',
    });
  } else {
    const tablesOk = await pgHasTables(pgPool, REQUIRED_PG_TABLES);
    checks.push({
      name: 'Postgres schema',
      status: tablesOk ? 'PASS' : 'BLOCKED',
      detail: tablesOk ? 'Required RBAC tables present' : 'Required RBAC tables missing',
    });
    if (tablesOk && adminId && testUserId) {
      await ensureFixtures(pgPool, Number(adminId), Number(testUserId));
    }
  }

  const testRolesRead = await http({
    url: `${baseUrl}/roles/`,
    method: 'GET',
    headers: { Authorization: `Bearer ${testToken}` },
  });
  const testRoleCreate = await http({
    url: `${baseUrl}/roles/`,
    method: 'POST',
    headers: { Authorization: `Bearer ${testToken}` },
    data: { roleName: 'qa_nope', roleKey: 'qa_nope', status: '0', roleSort: 1, menuIds: [], remark: 'qa' },
  });
  const adminRoleRead = await http({
    url: `${baseUrl}/roles/`,
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  checks.push({
    name: 'RBAC: testuser denied on admin endpoint',
    status: testRoleCreate.status === 403 ? 'PASS' : 'FAIL',
    detail: `POST /roles -> ${testRoleCreate.status}`,
  });
  checks.push({
    name: 'RBAC: admin allowed on admin endpoint',
    status: adminRoleRead.status === 200 ? 'PASS' : 'FAIL',
    detail: `GET /roles -> ${adminRoleRead.status}`,
  });
  checks.push({
    name: 'RBAC: testuser allowed on R|user',
    status: 'BLOCKED',
    detail: 'No route enforces PERMISSIONS.READ_USER (R|user) in api/src/routes',
  });

  let sessionRefreshResult: Check = {
    name: 'Session refresh (same token)',
    status: 'BLOCKED',
    detail: 'Skipped (Postgres not configured or userId missing)',
  };
  if (pgPool && adminId && testUserId && (await pgHasTables(pgPool, REQUIRED_PG_TABLES))) {
    await pgPool.query('BEGIN');
    try {
      const adminRole = await pgPool.query(`SELECT role_id FROM sys_role WHERE role_key='admin' LIMIT 1`);
      const adminRoleId = adminRole.rows[0]?.role_id;
      await pgPool.query(
        `INSERT INTO sys_user_role (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [testUserId, adminRoleId],
      );
      await pgPool.query('COMMIT');
    } catch (e) {
      await pgPool.query('ROLLBACK');
      throw e;
    }
    const afterPromote = await http({
      url: `${baseUrl}/roles/`,
      method: 'GET',
      headers: { Authorization: `Bearer ${testToken}` },
    });

    await pgPool.query('BEGIN');
    try {
      await pgPool.query(
        `DELETE FROM sys_user_role WHERE user_id=$1 AND role_id = (SELECT role_id FROM sys_role WHERE role_key='admin' LIMIT 1)`,
        [testUserId],
      );
      await pgPool.query('COMMIT');
    } catch (e) {
      await pgPool.query('ROLLBACK');
      throw e;
    }
    const afterDemote = await http({
      url: `${baseUrl}/roles/`,
      method: 'GET',
      headers: { Authorization: `Bearer ${testToken}` },
    });

    sessionRefreshResult = {
      name: 'Session refresh (same token)',
      status: afterPromote.status === 200 && afterDemote.status === 403 ? 'PASS' : 'FAIL',
      detail: `afterPromote=${afterPromote.status}, afterDemote=${afterDemote.status}`,
    };
  }
  checks.push(sessionRefreshResult);

  if (pgPool) await pgPool.end();

  const report = `# RBAC Verification Report

## Environment
- Backend base URL: \`${baseUrl}\`
- Health: \`GET /health\` -> ${health.status}
- Postgres: host=\`${process.env.PG_HOST || '127.0.0.1'}\`, port=\`${process.env.PG_PORT || '5432'}\`, db=\`${process.env.PG_DATABASE || 'expobot'}\`, user=\`${process.env.PG_USER || 'expobot'}\`, password=\`<redacted>\`
- Tokens: admin=\`${adminToken ? redactToken(adminToken) : '<missing>'}\`, testuser=\`${testToken ? redactToken(testToken) : '<missing>'}\`

## Checks
${checks.map((c) => `- ${c.name}: **${c.status}** — ${c.detail}`).join('\n')}

## Evidence
- /health body: \`${snippet(health.body)}\`
- testuser GET /roles: \`${snippet(testRolesRead.body)}\`
- testuser POST /roles: \`${snippet(testRoleCreate.body)}\`
- admin GET /roles: \`${snippet(adminRoleRead.body)}\`
- admin login: \`${snippet(adminLogin.body)}\`
- testuser login: \`${snippet(testLogin.body)}\`

## Notes
- R|user enforcement is not wired to any route; test is marked BLOCKED.
- Session refresh tests manipulate Postgres mappings directly to validate cache behavior without logout.
`;

  await fs.writeFile(reportPath, report, 'utf8');
  console.log(`Report written: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
