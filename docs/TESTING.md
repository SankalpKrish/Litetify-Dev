# Testing

## Test runner

Litetify uses **Vitest** for JavaScript/TypeScript tests and Rust's built-in test framework for Rust tests.

```bash
npm test          # Run all Vitest tests
npm run test:rust # Run Rust tests via Cargo
```

## Frontend tests

Tests live alongside source code with a `.test.ts` or `.test.tsx` extension.

### Current coverage

| Test file | What it covers | Status |
|-----------|---------------|--------|
| `src/smoke.test.ts` | Baseline pipeline check (`1 + 1 === 2`) | Active |

**Coverage is minimal.** The project is in pre-release (v0.1.0) with unit tests planned per the phase roadmap. Real tests for PKCE, API retry logic, and manifest validation have not been implemented yet.

### Running specific tests

```bash
npx vitest run                 # Run all tests once
npx vitest                     # Watch mode
npx vitest run src/smoke.test  # Single file
```

### Test conventions (when adding tests)

- Place test files next to the source file they test (e.g., `src/lib/api.test.ts` for `src/lib/api.ts`)
- Use Vitest's `describe`/`it`/`expect` globals
- Mock Tauri IPC calls with `vi.mock('@tauri-apps/api/core', ...)`
- Follow the pattern: arrange → act → assert

## Rust tests

Rust tests live at the bottom of each module or in a separate `tests/` directory for integration tests.

```bash
cargo test                              # Run all Rust tests
cargo test --features librespot          # Include librespot-gated tests
cargo test auth::                       # Run all auth module tests
cargo test -- --show-output             # Show stdout from passing tests
```

### Test conventions (Rust)

- Unit tests are in a `#[cfg(test)] mod tests { ... }` block at the bottom of each source file
- Integration tests go in `src-tauri/tests/`
- Mock external HTTP calls where possible (the `reqwest` client is not mocked yet)

## Linting and type checking

These gate the build pipeline:

```bash
npm run lint           # ESLint — zero-warning policy
npm run typecheck      # tsc --noEmit — strict mode
npm run format:check   # Prettier
```

```bash
cd src-tauri
cargo clippy           # Rust lints
```

## Future testing roadmap

Per `plan.md`, dedicated testing phases will add:

- **Unit tests** for PKCE code challenge/verifier logic, token serialization, API retry and rate-limit handling, and mod manifest validation
- **Component tests** for UI components (player controls, library views, search) using Vitest + Testing Library
- **Integration tests** for the Rust IPC handlers via Tauri's test harness
- **End-to-end tests** for the full login flow, playback lifecycle, and mod loading
