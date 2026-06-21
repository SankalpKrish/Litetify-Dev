# Deviations Log

Per `plan.md` §0.5: when execution deviates from the plan, log it here in one
line — `path`, reason, and what was done instead.

| Date | Phase/Task | File(s) | Reason | What was done instead |
| ---- | ---------- | ------- | ------ | --------------------- |
| 2026-06-19 | Phase 5 / pre-existing fix | `src-tauri/src/playback/mod.rs` | websdk.rs existed but mod.rs didn't declare `pub mod websdk;` — broke cargo check | Added `pub mod websdk;` declaration |
| 2026-06-21 | Phase 5 / Task 5.5 | `src/mods/sandbox.ts` | Security audit found `new Function()` sandbox trivially bypassable — `window.__TAURI_INTERNALS__`, `localStorage`, and `fetch` all reachable from extension scope | Rewrote sandbox to use hidden `<iframe sandbox="allow-scripts">` with unique origin, communicating via `postMessage` proxy. Eliminates all three bypass vectors. |
| 2026-06-21 | Phase 6 / deps | `src-tauri/Cargo.toml` | `librespot-core` build.rs requires `vergen-gitcl` → `vergen = "9.0.6"`, but latest `vergen` 9.1+ uses `vergen-lib` 9.1.0 which conflicts with `vergen-gitcl`'s `vergen-lib` 0.1.6 | Pinned `vergen = "=9.0.6"` as optional build-dep, feature-gated behind `librespot` to avoid overhead in default build |
| 2026-06-21 | Phase 6 / impl | `src-tauri/src/playback/librespot.rs` | `Player::new` requires `F: FnOnce() -> Box<dyn Sink> + Send`; `Box<dyn Sink>` is not `Send`, so capturing a pre-built sink in the closure fails | Used the sink builder function pointer inside the closure instead of capturing a pre-built sink. `move || sink_builder(None, format)` — the function pointer is `Send` |
