import { useCallback, useEffect, useMemo } from 'react';
import { useModsStore, scanMods, persistEnabledState, persistActiveThemeState, activateTheme } from '../../mods';

export function ModsSettings() {
  const registry = useModsStore((s) => s.registry);
  const activeTheme = useModsStore((s) => s.activeTheme);

  useEffect(() => {
    scanMods().then((mods) => {
      useModsStore.getState().setRegistry(mods);
    });
  }, []);

  const themes = useMemo(() => registry.filter((m) => m.manifest.type === 'theme' && !m.error), [registry]);
  const extensions = useMemo(() => registry.filter((m) => m.manifest.type === 'extension' && !m.error), [registry]);
  const apps = useMemo(() => registry.filter((m) => m.manifest.type === 'app' && !m.error), [registry]);
  const withErrors = useMemo(() => registry.filter((m) => m.error), [registry]);

  const handleToggle = useCallback((path: string, enabled: boolean) => {
    useModsStore.getState().toggleEnabled(path);
    persistEnabledState(path, enabled);
  }, []);

  const handleThemeChange = useCallback(
    (name: string | null) => {
      useModsStore.getState().setActiveTheme(name);
      persistActiveThemeState(name);
      activateTheme(name, registry);
    },
    [registry],
  );

  const handleOpenModsFolder = useCallback(() => {
    window.open('mods/', '_blank');
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
                      onChange={(e) => handleToggle(mod.path, e.target.checked)}
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
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={mod.enabled}
                      onChange={(e) => handleToggle(mod.path, e.target.checked)}
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
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={mod.enabled}
                      onChange={(e) => handleToggle(mod.path, e.target.checked)}
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
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
