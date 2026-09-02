const TOKEN_KEY = 'token';
const USERNAME_KEY = 'username';
const ROLE_KEY = 'role';
const PERMISSIONS_KEY = 'permissions';
const OFFICE_KEY = 'office';

export function saveAuth({ token, username, role, permissions, office }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions || {}));
  localStorage.setItem(OFFICE_KEY, office || 'tunis');
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(PERMISSIONS_KEY);
  localStorage.removeItem(OFFICE_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUsername() {
  return localStorage.getItem(USERNAME_KEY);
}

export function getRole() {
  return localStorage.getItem(ROLE_KEY);
}

export function getOffice() {
  return localStorage.getItem(OFFICE_KEY) || 'tunis';
}

export function isAdmin() {
  return getRole() === 'admin';
}

export function getPermissions() {
  try {
    return JSON.parse(localStorage.getItem(PERMISSIONS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function isAuthenticated() {
  return !!getToken();
}

export function canViewService(serviceId) {
  if (isAdmin()) return true;
  const entry = getPermissions()[String(serviceId)];
  return !!(entry && entry.view);
}

export function canUpdateService(serviceId) {
  if (isAdmin()) return true;
  const entry = getPermissions()[String(serviceId)];
  return !!(entry && entry.view && entry.update);
}

function normalizeGeneralExpensesPermission(entry) {
  if (typeof entry === 'boolean') {
    return { view: entry, update: entry };
  }
  if (entry && typeof entry === 'object') {
    return {
      view: !!(entry.view || entry.update),
      update: !!entry.update,
    };
  }
  return { view: false, update: false };
}

export function canViewGeneralExpenses() {
  if (isAdmin()) return true;
  const perms = getPermissions();
  const entry = perms.general_expenses || perms['general-expenses'] || perms.generalExpenses;
  return normalizeGeneralExpensesPermission(entry).view;
}

export function canUpdateGeneralExpenses() {
  if (isAdmin()) return true;
  const perms = getPermissions();
  const entry = perms.general_expenses || perms['general-expenses'] || perms.generalExpenses;
  return normalizeGeneralExpensesPermission(entry).update;
}

export function getAccessibleServices(services) {
  if (isAdmin()) return services;
  return services.filter((s) => canViewService(s.id));
}
