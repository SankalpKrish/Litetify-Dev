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

export async function checkAuth(): Promise<boolean> {
  try {
    return await invoke<boolean>('check_auth');
  } catch {
    return false;
  }
}

export async function login(clientId: string, enabledFeatures?: string[]): Promise<void> {
  await invoke('login', { clientId, enabledFeatures });
  persistClientId(clientId);
}

export async function checkReauthNeeded(enabledFeatures: string[]): Promise<string[]> {
  return await invoke<string[]>('check_reauth_needed', { enabledFeatures });
}

export async function getGrantedScopes(): Promise<string[]> {
  return await invoke<string[]>('get_granted_scopes_command');
}

export async function logout(): Promise<void> {
  try {
    await invoke('logout');
  } finally {
    clearClientId();
  }
}
