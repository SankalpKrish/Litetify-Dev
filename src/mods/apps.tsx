import { readModFile } from './loader';
import { createLitetifyAPI } from './api';
import { useModsStore } from './store';
import { MountContainer, HtmlContainer } from './components';

function filterApiByPermissions(api: Record<string, unknown>, permissions: string[]): Record<string, unknown> {
  if (!permissions || permissions.length === 0) return {};
  function matches(path: string): boolean {
    return permissions.some(p => p === path || path.startsWith(p + '.') || (p.endsWith(':*') && path.startsWith(p.slice(0, -2))));
  }
  function walk(obj: Record<string, unknown>, prefix: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'function') {
        if (matches(path)) {
          result[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        const nested = walk(value as Record<string, unknown>, path);
        if (Object.keys(nested).length > 0) {
          result[key] = nested;
        }
      }
    }
    return result;
  }
  return walk(api, '');
}

export async function loadCustomApp(mod: { manifest: { type: string; name: string; entry: string; permissions?: string[] }; path: string }): Promise<void> {
  if (mod.manifest.type !== 'app') return;

  const code = await readModFile(mod.path, mod.manifest.entry);
  const modId = mod.manifest.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const api = filterApiByPermissions(createLitetifyAPI(modId) as unknown as Record<string, unknown>, mod.manifest.permissions || []);

  const globals: Record<string, unknown> = {
    console: {
      log: (...args: unknown[]) => console.log("[mod:" + modId + "]", ...args),
      warn: (...args: unknown[]) => console.warn("[mod:" + modId + "]", ...args),
      error: (...args: unknown[]) => console.error("[mod:" + modId + "]", ...args),
    },
    Litetify: api,
  };

  try {
    const keys = Object.keys(globals);
    const vals = Object.values(globals);
    const fn = new Function(...keys, '"use strict";\n' + code + '\n//# sourceURL=mod://' + modId + '/' + mod.manifest.entry);

    const result = fn(...vals);
    const appDef = (result && typeof result === 'object' ? result : {}) as Record<string, unknown>;
    const label = ((appDef.label as string) || mod.manifest.name);

    if (typeof appDef.mount === 'function') {
      const m = appDef.mount as (el: HTMLElement) => void;
      const u = typeof appDef.unmount === 'function' ? (appDef.unmount as () => void) : undefined;
      useModsStore.getState().registerCustomView(modId, label, () => <MountContainer mount={m} unmount={u} />);
    } else if (typeof appDef.render === 'function') {
      const renderFn = appDef.render as () => string;
      useModsStore.getState().registerCustomView(modId, label, () => <HtmlContainer html={renderFn()} />);
    }
  } catch (err) {
    console.error("[mods] Failed to load custom app '" + mod.manifest.name + "':", err);
  }
}
