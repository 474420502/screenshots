# Linux Packaged App Issue Draft

## Maintainer Reply Draft

Thanks for the detailed report and reproduction notes.

Yes, using `@474420502/electron-screenshots` as a workspace-linked dependency inside another Electron app is an intended integration scenario, and packaging that host app with `electron-builder` is a supported use case.

The runtime failure you hit on Linux makes sense. The root cause was that `@474420502/electron-screenshots` still used `fs-extra` at runtime for a few file operations. In some packaged `pnpm workspace + electron-builder` layouts, module resolution could end up picking `jsonfile@4` from another dependency tree instead of the `jsonfile@6` expected by `fs-extra@11`, which then breaks on `require('jsonfile/utils')`.

I have changed the Electron package to stop using `fs-extra` at runtime and switched those paths to built-in `node:fs/promises` instead. That removes the `fs-extra -> jsonfile/utils` runtime chain entirely.

What changed:

- removed `fs-extra` from `@474420502/electron-screenshots` runtime dependencies
- moved runtime file writes / temp resource operations to `node:fs/promises`
- documented `pnpm workspace + electron-builder` as a supported host packaging scenario
- added packaging notes to clarify that host apps should keep runtime deps and native deps visible in packaged output

So after this change, host apps should no longer need to add `jsonfile@6.x` manually just to make screenshots load in packaged Linux builds.

Your note about runtime dependency visibility is also valid. If a host app aggressively externalizes, prunes, or whitelists workspace packages during packaging, it still needs to ensure actual runtime deps such as `debug` and native deps such as `node-screenshots` remain available inside the packaged app.

If you are willing to share a minimal reproduction repo, it would still be useful for validating the packaged-host scenario across more builder setups, but the concrete `jsonfile/utils` failure path should be addressed by this fix.

## Release Note Draft

### Electron packaging fix for pnpm workspace hosts

Fixed a Linux packaged-app runtime issue affecting `@474420502/electron-screenshots` when consumed from another Electron app through a `pnpm workspace` and packaged with `electron-builder`.

Previously, packaged apps could fail at runtime with:

```text
Cannot find module 'jsonfile/utils'
```

This happened because the Electron package still relied on `fs-extra` at runtime, which could resolve the wrong `jsonfile` version from another dependency tree in packaged workspace layouts.

This release removes that runtime dependency chain by switching file operations to built-in `node:fs/promises`.

Impact:

- `pnpm workspace + electron-builder` host apps are now a documented supported scenario
- Linux packaged apps should no longer need a manual `jsonfile@6.x` workaround just to load `@474420502/electron-screenshots`
- host apps still need to make sure true runtime deps and native deps remain included in packaged output
