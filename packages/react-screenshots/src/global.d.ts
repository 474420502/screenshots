import { Display } from './electron/app';
import { Bounds } from './Screenshots/types';

type ScreenshotsListener<T extends unknown[] = unknown[]> = (
  ...args: T
) => void;

interface ScreenshotsData {
  bounds: Bounds;
  display: Display;
}

interface ScreenshotsExtensionOperationData {
  key: string;
  bounds: Bounds | null;
  display: Display;
}

interface ScreenshotsRendererEvent {
  name: string;
  payload?: unknown;
  snapshot?: unknown;
  display?: Display;
}

interface GlobalScreenshots {
  ready: () => void;
  reset: () => void;
  save: (arrayBuffer: ArrayBuffer, data: ScreenshotsData) => void;
  cancel: () => void;
  ok: (arrayBuffer: ArrayBuffer, data: ScreenshotsData) => void;
  extensionOperation: (
    arrayBuffer: ArrayBuffer | null,
    data: ScreenshotsExtensionOperationData,
  ) => void;
  event: (event: ScreenshotsRendererEvent) => void;
  on: <T extends unknown[]>(
    channel: string,
    fn: ScreenshotsListener<T>,
  ) => void;
  off: <T extends unknown[]>(
    channel: string,
    fn: ScreenshotsListener<T>,
  ) => void;
}

declare global {
  interface Window {
    screenshots: GlobalScreenshots;
  }
}
