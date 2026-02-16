const ADMIN_WILDCARD = '*|*';

const splitPermissions = (rawPerms) => {
  if (!rawPerms) return [];
  return rawPerms
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizePermissions = (permissions) =>
  Array.from(new Set(permissions.map((item) => item.trim()).filter(Boolean)));

const matchesPermission = (permissions, requiredPermission, type) => {
  if (permissions.includes(ADMIN_WILDCARD)) return true;
  if (permissions.includes(requiredPermission)) return true;
  if (requiredPermission.includes('|')) return false;
  if (type === undefined || type === null || String(type).trim().length === 0) return false;
  return permissions.includes(`${requiredPermission}|${String(type).trim()}`);
};

const assert = (name, condition) => {
  if (!condition) throw new Error(`FAILED: ${name}`);
  console.log(`PASS: ${name}`);
};

const main = () => {
  const parsed = splitPermissions('R|role, C|role ,U|menu');
  assert('split comma permissions', parsed.length === 3 && parsed[1] === 'C|role');

  const normalized = normalizePermissions(['R|role', 'R|role', 'C|role']);
  assert('deduplicate permissions', normalized.length === 2);

  assert('admin wildcard grants all', matchesPermission(['*|*'], 'D|role') === true);
  assert('exact permission match', matchesPermission(['R|role'], 'R|role') === true);
  assert('typed permission match', matchesPermission(['R|role'], 'R', 'role') === true);
  assert('typed permission mismatch', matchesPermission(['R|role'], 'R', 'menu') === false);
  assert('deny when no permission', matchesPermission(['R|menu'], 'C|menu') === false);

  console.log('RBAC verification complete.');
};

main();
