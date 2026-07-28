const TOKEN_KEY = 'token';
const USERNAME_KEY = 'username';
const ROLE_KEY = 'role';
const PERMISSIONS_KEY = 'permissions';

export function saveAuth({ token, username, role, permissions }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions || {}));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(PERMISSIONS_KEY);
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

export function getAccessibleServices(services) {
  if (isAdmin()) return services;
  return services.filter((s) => canViewService(s.id));
}
