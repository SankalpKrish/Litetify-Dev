import { invoke } from '@tauri-apps/api/core';

export type AuthStatus =
  | 'loading'
  | 'unauthenticated'
  | 'authenticated'
  | 'error';

export interface AuthState {
  status: AuthStatus;
  error: string | null;
  clientId: string;
}

function loadClientId(): string {
  try {
    return localStorage.getItem('litetify:clientId') ?? '';
  } catch {
    return '';
  }
}

function saveClientId(id: string): void {
  try {
    localStorage.setItem('litetify:clientId', id);
  } catch {
    // storage unavailable
  }
}

export function getStoredClientId(): string {
  return loadClientId();
}

export function persistClientId(id: string): void {
  saveClientId(id);
}

export function clearClientId(): void {
  try {
    localStorage.removeItem('litetify:clientId');
  } catch {
    // noop
  }
}

const DEV_MODE_KEY = 'litetify:devMode';

export function isDevMode(): boolean {
  try {
    return localStorage.getItem(DEV_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function enableDevMode(): void {
  try {
    localStorage.setItem(DEV_MODE_KEY, 'true');
  } catch { /* noop */ }
}

export function disableDevMode(): void {
  try {
    localStorage.removeItem(DEV_MODE_KEY);
  } catch { /* noop */ }
}

export async function checkAuth(): Promise<boolean> {
  try {
    return await invoke<boolean>('check_auth');
  } catch {
    return false;
  }
}

export async function login(clientId: string): Promise<void> {
  await invoke('login', { clientId });
  persistClientId(clientId);
}

export async function logout(): Promise<void> {
  try {
    await invoke('logout');
  } finally {
    clearClientId();
  }
}
