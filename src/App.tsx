import { useEffect, useState } from 'react';

/**
 * Phase 0 placeholder shell. Proves the Tauri webview + React render path and
 * the Rust IPC bridge work end-to-end. Real auth/player UI lands in later
 * phases (see plan.md).
 */
export function App(): React.JSX.Element {
  const [greeting, setGreeting] = useState<string>('connecting to core…');

  useEffect(() => {
    let cancelled = false;
    // Lazy-import so the web-only `npm run dev` build doesn't hard-fail
    // when the Tauri runtime is absent.
    import('@tauri-apps/api/core')
      .then(({ invoke }) => invoke<string>('ping'))
      .then((msg) => {
        if (!cancelled) setGreeting(msg);
      })
      .catch(() => {
        if (!cancelled) setGreeting('running in browser (no Tauri core)');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="shell">
      <h1>Litetify</h1>
      <p className="tagline">Lightweight. Moddable. Yours.</p>
      <p className="status">Core says: {greeting}</p>
    </main>
  );
}
