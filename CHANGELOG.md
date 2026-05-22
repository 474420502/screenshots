# Changelog

## 0.7.0 - 2026-05-22

### Added

- React package now exposes a documented custom toolbar button API through `operationItems`, `extraOperationItems`, `ScreenshotsActionContext`, and unified lifecycle events.
- Electron package now supports serializable custom toolbar buttons for OCR, AI, upload, and automation flows, including `checked`, `disabled`, and `updateOperationItem` for async state updates.
- Electron package now supports `requiresSelection` for selection-gated custom buttons and `captureOnce()` for one-shot Promise-based capture flows that return the final image directly.
- Electron package now exposes an official image resource handoff API for business integrations, including temp file creation, token lookup, cleanup methods, and automatic `imageResource` delivery in custom button callbacks.
- Electron package now supports a serializable `option` bridge so main-process integrations can render OCR or AI result panels inside the screenshot toolbar UI without a separate renderer implementation.
- Electron package now supports main-process-first operation handlers, including inline `handler` definitions on operation items and helper context methods like `showOption` and `clearOption` for lower-friction integrations.
- Electron package runtime file operations now use built-in `node:fs/promises` instead of `fs-extra`, which removes the `jsonfile/utils` transitive dependency path that could break Linux packaged apps in `pnpm workspace + electron-builder` setups.
- Runtime validation for custom button layout now rejects duplicate keys, reserved built-in keys, and missing anchors instead of silently falling back.

### Documentation

- Expanded the React and Electron package READMEs with custom button feature overviews, positioning rules, validation behavior, and end-to-end usage examples.
- Added root-level release notes and quick links for the custom button documentation.

### Validation

- React package tests cover operation layout resolution and shared state transition semantics.
- Electron package tests cover single-item custom button patching used by `updateOperationItem`.
- Electron package tests now cover selection-gated renderer mapping for `requiresSelection`.