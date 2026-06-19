# Deviations Log

Per `plan.md` §0.5: when execution deviates from the plan, log it here in one
line — `path`, reason, and what was done instead.

| Date | Phase/Task | File(s) | Reason | What was done instead |
| ---- | ---------- | ------- | ------ | --------------------- |
| 2026-06-19 | Phase 5 / pre-existing fix | `src-tauri/src/playback/mod.rs` | websdk.rs existed but mod.rs didn't declare `pub mod websdk;` — broke cargo check | Added `pub mod websdk;` declaration |
