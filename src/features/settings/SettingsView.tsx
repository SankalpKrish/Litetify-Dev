import { useState, useCallback } from 'react';
import { getStoredClientId } from '../../features/auth/authStore';
import { ModsSettings } from './Mods';
import { PlaybackSettings } from './Playback';
import { PermissionsSettings } from './Permissions';
import { KeybindingsSettings } from './Keybindings';
import { logout } from '../../features/auth/authStore';

interface SettingsViewProps {
  onLogout: () => void;
}

type SettingsTab = 'playback' | 'mods' | 'permissions' | 'keybindings' | 'account';

export function SettingsView({ onLogout }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('playback');
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const handleLogout = useCallback(async () => {
    await logout();
    onLogout();
  }, [onLogout]);

  return (
    <div className="settings-view">
      <h1 className="page-title" style={{ marginBottom: 'var(--lt-space-xl)' }}>Settings</h1>
      <nav className="settings-tabs" aria-label="Settings">
        <button
          className={`settings-tab${activeTab === 'playback' ? ' settings-tab-active' : ''}`}
          onClick={() => setActiveTab('playback')}
        >
          Playback
        </button>
        <button
          className={`settings-tab${activeTab === 'mods' ? ' settings-tab-active' : ''}`}
          onClick={() => setActiveTab('mods')}
        >
          Mods
        </button>
        <button
          className={`settings-tab${activeTab === 'permissions' ? ' settings-tab-active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          Permissions
        </button>
        <button
          className={`settings-tab${activeTab === 'keybindings' ? ' settings-tab-active' : ''}`}
          onClick={() => setActiveTab('keybindings')}
        >
          Shortcuts
        </button>
        <button
          className={`settings-tab${activeTab === 'account' ? ' settings-tab-active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          Account
        </button>
      </nav>
      <div className="settings-content">
        {activeTab === 'playback' && <PlaybackSettings />}
        {activeTab === 'mods' && <ModsSettings />}
        {activeTab === 'permissions' && <PermissionsSettings />}
        {activeTab === 'keybindings' && <KeybindingsSettings />}
        {activeTab === 'account' && (
          <div className="settings-page">
            <div className="settings-header">
              <h2>Account</h2>
            </div>
            <div className="settings-section">
              <div className="mod-item">
                <div className="mod-item-info">
                  <strong>Client ID</strong>
                  <p className="mod-item-desc" style={{ fontFamily: 'monospace', fontSize: 'var(--lt-font-size-xs)' }}>
                    {getStoredClientId() || 'Not configured'}
                  </p>
                </div>
              </div>
            </div>
            <div className="settings-section">
              {!confirmingLogout ? (
                <button
                  className="btn btn-secondary"
                  onClick={() => setConfirmingLogout(true)}
                  style={{ color: 'var(--lt-danger, #e74c3c)', borderColor: 'var(--lt-danger, #e74c3c)' }}
                >
                  Log out
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 'var(--lt-space-md)', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--lt-font-size-sm)' }}>Are you sure?</span>
                  <button className="btn btn-primary" onClick={handleLogout}>
                    Confirm logout
                  </button>
                  <button className="btn btn-secondary" onClick={() => setConfirmingLogout(false)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
