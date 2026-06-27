import { useCallback, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openPath } from '@tauri-apps/plugin-opener';
import { useModsStore, scanMods, persistEnabledState, persistActiveThemeState, activateTheme, loadCustomApp, loadTheme } from '../../mods';
import type { ModEntry } from '../../mods/manifest';

export function ModsSettings() {
  const registry = useModsStore((s) => s.registry);
  const activeTheme = useModsStore((s) => s.activeTheme);

  useEffect(() => {
    scanMods()
      .then((mods) => {
        useModsStore.getState().setRegistry(mods);
      })
      .catch((err) => console.error('[mods] scanMods failed:', err));
  }, []);

  const themes = useMemo(() => registry.filter((m) => m.manifest.type === 'theme' && !m.error), [registry]);
  const extensions = useMemo(() => registry.filter((m) => m.manifest.type === 'extension' && !m.error), [registry]);
  const apps = useMemo(() => registry.filter((m) => m.manifest.type === 'app' && !m.error), [registry]);
  const withErrors = useMemo(() => registry.filter((m) => m.error), [registry]);

  const handleToggle = useCallback(async (mod: ModEntry) => {
    const store = useModsStore.getState();
    store.toggleEnabled(mod.path);
    persistEnabledState();

    const nowEnabled = !mod.enabled;
    console.log(`[mods] toggle ${mod.manifest.name}: enabled=${nowEnabled}, path=${mod.path}, type=${mod.manifest.type}`);
    try {
      if (nowEnabled) {
        switch (mod.manifest.type) {
          case 'app':
            await loadCustomApp(mod);
            const modId = mod.manifest.name.replace(/[^a-zA-Z0-9_-]/g, '_');
            const registered = useModsStore.getState().customViews.has(modId);
            console.log(`[mods] loadCustomApp succeeded for ${mod.manifest.name}, registered=${registered}`);
            break;
          case 'theme':
            await loadTheme(mod);
            break;
          case 'extension':
            // extensions load via loadEnabledMods on restart
            break;
        }
      } else {
        // Unload disabled app by unregistering its custom view
        if (mod.manifest.type === 'app') {
          const modId = mod.manifest.name.replace(/[^a-zA-Z0-9_-]/g, '_');
          store.unregisterCustomView(modId);
        }
      }
    } catch (err) {
      console.error(`[mods] Failed to ${nowEnabled ? 'load' : 'unload'} ${mod.manifest.name}:`, err);
    }
  }, []);

  const handleThemeChange = useCallback(
    (name: string | null) => {
      useModsStore.getState().setActiveTheme(name);
      persistActiveThemeState(name);
      activateTheme(name, registry);
    },
    [registry],
  );

  const handleOpenModsFolder = useCallback(async () => {
    try {
      const modsPath = await invoke<string>('get_mods_path');
      await openPath(modsPath);
    } catch (err) {
      console.error('[mods] Failed to open mods folder:', err);
    }
  }, []);

  const handleOpenModFolder = useCallback(async (mod: ModEntry) => {
    try {
      await openPath(mod.path);
    } catch (err) {
      console.error('[mods] Failed to open mod folder:', err);
    }
  }, []);

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Mods</h2>
        <button className="btn btn-secondary" onClick={handleOpenModsFolder}>
          Open mods folder
        </button>
      </div>

      {themes.length > 0 && (
        <section className="settings-section">
          <h3>Themes ({themes.length})</h3>
          <div className="mod-list">
            {themes.map((mod) => (
              <div key={mod.path} className="mod-item">
                <div className="mod-item-info">
                  <strong>{mod.manifest.name}</strong>
                  <span className="mod-item-version">v{mod.manifest.version}</span>
                  {mod.manifest.description && <p className="mod-item-desc">{mod.manifest.description}</p>}
                  {mod.manifest.author && <span className="mod-item-author">by {mod.manifest.author}</span>}
                </div>
                <div className="mod-item-actions">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleOpenModFolder(mod)}
                    title="Open in file explorer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                  </button>
                  <button
                    className={`btn btn-sm ${activeTheme === mod.manifest.name ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() =>
                      handleThemeChange(activeTheme === mod.manifest.name ? null : mod.manifest.name)
                    }
                    disabled={!mod.enabled}
                  >
                    {activeTheme === mod.manifest.name ? 'Active' : 'Apply'}
                  </button>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={mod.enabled}
                      onChange={() => handleToggle(mod)}
                      aria-label={"Enable " + mod.manifest.name}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {extensions.length > 0 && (
        <section className="settings-section">
          <h3>Extensions ({extensions.length})</h3>
          <div className="mod-list">
            {extensions.map((mod) => (
              <div key={mod.path} className="mod-item">
                <div className="mod-item-info">
                  <strong>{mod.manifest.name}</strong>
                  <span className="mod-item-version">v{mod.manifest.version}</span>
                  {mod.manifest.description && <p className="mod-item-desc">{mod.manifest.description}</p>}
                  {mod.manifest.author && <span className="mod-item-author">by {mod.manifest.author}</span>}
                  {mod.manifest.permissions && mod.manifest.permissions.length > 0 && (
                    <div className="mod-item-perms">
                      <small>Permissions: {mod.manifest.permissions.join(', ')}</small>
                    </div>
                  )}
                </div>
                <div className="mod-item-actions">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleOpenModFolder(mod)}
                    title="Open in file explorer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                  </button>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={mod.enabled}
                      onChange={() => handleToggle(mod)}
                      aria-label={"Enable " + mod.manifest.name}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {apps.length > 0 && (
        <section className="settings-section">
          <h3>Custom Apps ({apps.length})</h3>
          <div className="mod-list">
            {apps.map((mod) => (
              <div key={mod.path} className="mod-item">
                <div className="mod-item-info">
                  <strong>{mod.manifest.name}</strong>
                  <span className="mod-item-version">v{mod.manifest.version}</span>
                  {mod.manifest.description && <p className="mod-item-desc">{mod.manifest.description}</p>}
                  {mod.manifest.author && <span className="mod-item-author">by {mod.manifest.author}</span>}
                </div>
                <div className="mod-item-actions">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleOpenModFolder(mod)}
                    title="Open in file explorer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                  </button>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={mod.enabled}
                      onChange={() => handleToggle(mod)}
                      aria-label={"Enable " + mod.manifest.name}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {registry.length === 0 && (
        <section className="settings-section">
          <p className="mod-empty">
            No mods installed. Place mod folders in the <code>mods/</code> directory.
          </p>
        </section>
      )}

      {withErrors.length > 0 && (
        <section className="settings-section settings-section-errors">
          <h3>Errors ({withErrors.length})</h3>
          <div className="mod-list">
            {withErrors.map((mod) => (
              <div key={mod.path} className="mod-item mod-item-error">
                <div className="mod-item-info">
                  <strong>{mod.manifest.name || mod.path.split(/[\\/]/).pop()}</strong>
                  <p className="mod-item-error-msg">{mod.error}</p>
                </div>
                <div className="mod-item-actions">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleOpenModFolder(mod)}
                    title="Open in file explorer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
