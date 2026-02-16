import axios from 'axios';

const BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:9090';
const ADMIN_EMP_ID = process.env.ADMIN_EMP_ID || 'EMP000001';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '12345';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function login(employeeId: string, password: string) {
  const res = await axios.post(`${BASE_URL}/api/auth/login`, { employeeId, password }, { validateStatus: () => true });
  return res;
}

async function main() {
  const adminLogin = await login(ADMIN_EMP_ID, ADMIN_PASSWORD);
  assert(adminLogin.status === 200, `Admin login failed: ${adminLogin.status}`);
  const adminToken = adminLogin.data?.result?.token;
  assert(adminToken, 'Missing admin token');

  const suffix = Date.now();
  const employeeId = `EMP_AUTO_${suffix}`;
  const password = `pw_${suffix}`;

  const createRes = await axios.post(
    `${BASE_URL}/api/admin/users`,
    {
      firstName: 'Auto',
      lastName: 'Tester',
      employeeId,
      userJobRole: 'tester',
      areaOfWork: 'ayase',
      role: 'user',
      password,
    },
    { headers: { Authorization: `Bearer ${adminToken}` }, validateStatus: () => true },
  );
  assert(createRes.status === 200, `Create user failed: ${createRes.status}`);

  const userLogin = await login(employeeId, password);
  assert(userLogin.status === 200, `New user login failed: ${userLogin.status}`);
  const userToken = userLogin.data?.result?.token;
  assert(userToken, 'Missing user token');

  const forbiddenRes = await axios.get(`${BASE_URL}/api/admin/users`, {
    headers: { Authorization: `Bearer ${userToken}` },
    validateStatus: () => true,
  });
  assert(forbiddenRes.status === 403, `Non-admin access should be 403, got ${forbiddenRes.status}`);

  console.log('PASS: create user, employeeId login, and non-admin protection verified');
}

main().catch((error) => {
  console.error('FAIL:', error.message);
  process.exit(1);
});
