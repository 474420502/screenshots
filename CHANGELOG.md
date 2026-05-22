# Changelog

## 0.7.0 - 2026-05-22

### Added

- React package now exposes a documented custom toolbar button API through `operationItems`, `extraOperationItems`, `ScreenshotsActionContext`, and unified lifecycle events.
- Electron package now supports serializable custom toolbar buttons for OCR, AI, upload, and automation flows, including `checked`, `disabled`, and `updateOperationItem` for async state updates.
- Runtime validation for custom button layout now rejects duplicate keys, reserved built-in keys, and missing anchors instead of silently falling back.

### Documentation

- Expanded the React and Electron package READMEs with custom button feature overviews, positioning rules, validation behavior, and end-to-end usage examples.
- Added root-level release notes and quick links for the custom button documentation.

### Validation

- React package tests cover operation layout resolution and shared state transition semantics.
- Electron package tests cover single-item custom button patching used by `updateOperationItem`.