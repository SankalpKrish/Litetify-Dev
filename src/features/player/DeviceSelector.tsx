import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGetAvailableDevices, apiTransferPlayback } from '../../lib/api';

interface DeviceInfo {
  id: string;
  name: string;
  is_active: boolean;
  volume_percent: number | null;
}

export function DeviceSelector() {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  const ref = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    apiGetAvailableDevices()
      .then(setDevices)
      .catch((err) => console.warn('Failed to fetch devices:', err));
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const transfer = useCallback(async (deviceId: string) => {
    try {
      await apiTransferPlayback([deviceId], true);
      setOpen(false);
    } catch (err) {
      console.warn('Device transfer failed:', err);
    }
  }, []);

  return (
    <div className="device-selector" ref={ref}>
      <button
        className="ctrl-btn ctrl-icon-btn"
        onClick={() => setOpen(!open)}
        aria-label="Connect to a device"
        aria-expanded={open}
        aria-haspopup="true"
        title="Connect to a device"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      </button>
      {open && (
        <div className="device-dropdown" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
          <div className="device-dropdown-header">Connect to device</div>
          {devices.length === 0 && (
            <div className="device-empty">No devices found</div>
          )}
          {devices.map((d) => (
            <button
              key={d.id}
              className={`device-item ${d.is_active ? 'device-active' : ''}`}
              onClick={() => transfer(d.id)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>{d.name}</span>
              {d.is_active && <span className="device-badge">Active</span>}
            </button>
          ))}
          <button className="device-refresh" onClick={refresh}>
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
