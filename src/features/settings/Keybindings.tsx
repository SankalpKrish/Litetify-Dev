import { useState } from 'react';
import { loadKeybindings, saveKeybindings, actionLabels, keyLabels } from '../../lib/keybindings';
import type { Keybindings as KB } from '../../lib/keybindings';

export function KeybindingsSettings() {
  const [bindings, setBindings] = useState<KB>(loadKeybindings);
  const [listening, setListening] = useState<keyof KB | null>(null);

  const startListen = (key: keyof KB) => {
    setListening(key);
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      const newBindings = { ...bindings, [key]: e.code };
      setBindings(newBindings);
      saveKeybindings(newBindings);
      setListening(null);
      document.removeEventListener('keydown', onKey);
    };
    document.addEventListener('keydown', onKey);
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Keyboard Shortcuts</h2>
      </div>
      <div className="settings-section">
        {(Object.keys(actionLabels) as (keyof KB)[]).map((action) => (
          <div key={action} className="mod-item">
            <div className="mod-item-info">
              <strong>{actionLabels[action]}</strong>
            </div>
            <button
              className={`btn${listening === action ? ' btn-primary' : ' btn-secondary'}`}
              onClick={() => startListen(action)}
            >
              {listening === action ? 'Press a key...' : keyLabels[bindings[action]] || bindings[action]}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
