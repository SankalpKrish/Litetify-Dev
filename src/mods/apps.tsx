import { readModFile } from './loader';
import { createLitetifyAPI } from './api';
import { useModsStore } from './store';
import { MountContainer, HtmlContainer } from './components';

export async function loadCustomApp(mod: { manifest: { type: string; name: string; entry: string }; path: string }): Promise<void> {
  if (mod.manifest.type !== 'app') return;

  const code = await readModFile(mod.path, mod.manifest.entry);
  const modId = mod.manifest.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const api = createLitetifyAPI(modId);

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
