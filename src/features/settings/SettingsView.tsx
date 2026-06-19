import { ModsSettings } from './Mods';

type SettingsTab = 'mods';

export function SettingsView() {
  const activeTab: SettingsTab = 'mods';

  return (
    <div className="settings-view">
      <h1 className="page-title" style={{ marginBottom: 'var(--lt-space-xl)' }}>Settings</h1>
      <nav className="settings-tabs" aria-label="Settings">
        <button className="settings-tab settings-tab-active">Mods</button>
      </nav>
      <div className="settings-content">
        {activeTab === 'mods' && <ModsSettings />}
      </div>
    </div>
  );
}
