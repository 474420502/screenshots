import type {
  MutableRefObject,
  ReactNode,
  PointerEvent as ReactPointerEvent,
} from 'react';

export type CanvasContextRef =
  MutableRefObject<CanvasRenderingContext2D | null>;

// biome-ignore lint/suspicious/noExplicitAny: any needed
export type EmitterListener = (...args: any[]) => unknown;

export type Emitter = Record<string, EmitterListener[]>;

export type EmitterRef = MutableRefObject<Emitter>;

export interface Point {
  x: number;
  y: number;
}

export enum HistoryItemType {
  Edit,
  Source,
}

export interface HistoryItemEdit<E, S> {
  type: HistoryItemType.Edit;
  data: E;
  source: HistoryItemSource<S, E>;
}

export interface HistoryItemSource<S, E> {
  name: string;
  type: HistoryItemType.Source;
  data: S;
  isSelected?: boolean;
  editHistory: HistoryItemEdit<E, S>[];
  draw: (
    ctx: CanvasRenderingContext2D,
    action: HistoryItemSource<S, E>,
  ) => void;
  isHit?: (
    ctx: CanvasRenderingContext2D,
    action: HistoryItemSource<S, E>,
    point: Point,
  ) => boolean;
}

export type HistoryItem<S, E> = HistoryItemEdit<E, S> | HistoryItemSource<S, E>;

export interface History {
  index: number;
  // biome-ignore lint/suspicious/noExplicitAny: any needed
  stack: HistoryItem<any, any>[];
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Position = Point;

export type ScreenshotsEventName =
  | 'captureReady'
  | 'selectionStart'
  | 'selectionChange'
  | 'selectionEnd'
  | 'selectionResizeStart'
  | 'selectionResizeChange'
  | 'selectionResizeEnd'
  | 'operationChange'
  | 'historyChange'
  | 'drawSelect'
  | 'pointerDown'
  | 'pointerMove'
  | 'pointerUp'
  | 'beforeSave'
  | 'save'
  | 'beforeOk'
  | 'ok'
  | 'cancel'
  | 'undo'
  | 'redo'
  | 'reset'
  | 'extensionOperation'
  | 'custom'
  | 'error';

export interface ScreenshotsStateSnapshot {
  url?: string;
  width: number;
  height: number;
  image: HTMLImageElement | null;
  bounds: Bounds | null;
  cursor?: string;
  operation?: string;
  history: History;
}

export interface ScreenshotsExtensionOperationPayload {
  key: string;
  bounds: Bounds | null;
}

export interface ScreenshotsEventPayloadMap {
  captureReady: ScreenshotsStateSnapshot;
  selectionStart: { point: Point; bounds: Bounds | null };
  selectionChange: { bounds: Bounds };
  selectionEnd: { bounds: Bounds | null };
  selectionResizeStart: { bounds: Bounds; resizeOrMove: string };
  selectionResizeChange: { bounds: Bounds; resizeOrMove: string };
  selectionResizeEnd: { bounds: Bounds | null; resizeOrMove: string };
  operationChange: { operation?: string; previousOperation?: string };
  historyChange: { action: string; history: History };
  drawSelect: { action: HistoryItemSource<unknown, unknown> };
  pointerDown: { point: Point; nativeEvent: PointerEvent };
  pointerMove: { point: Point; nativeEvent: PointerEvent };
  pointerUp: { point: Point; nativeEvent: PointerEvent };
  beforeSave: { bounds: Bounds };
  save: { blob: Blob | null; bounds: Bounds };
  beforeOk: { bounds: Bounds; source: 'button' | 'doubleClick' };
  ok: { blob: Blob | null; bounds: Bounds; source: 'button' | 'doubleClick' };
  cancel: { source: 'button' | 'contextMenu' };
  undo: { history: History };
  redo: { history: History };
  reset: { source?: string };
  extensionOperation: ScreenshotsExtensionOperationPayload;
  custom: unknown;
  error: { error: unknown; source?: string };
}

export interface ScreenshotsEvent<
  Name extends ScreenshotsEventName = ScreenshotsEventName,
> {
  name: Name;
  payload?: ScreenshotsEventPayloadMap[Name];
  snapshot: ScreenshotsStateSnapshot;
}

export type ScreenshotsEventDispatcher = <Name extends ScreenshotsEventName>(
  name: Name,
  payload?: ScreenshotsEventPayloadMap[Name],
) => void;

export interface ScreenshotsActionContext {
  getSnapshot: () => ScreenshotsStateSnapshot;
  compose: (bounds?: Bounds) => Promise<Blob | null>;
  reset: (source?: string) => void;
  emit: ScreenshotsEventDispatcher;
  setBounds: (bounds: Bounds | null) => void;
  setOperation: (operation?: string) => void;
}

export type ScreenshotsOperationPosition =
  | 'start'
  | 'before-history'
  | 'before-confirm'
  | 'end'
  | {
      before: string;
    }
  | {
      after: string;
    };

export interface ScreenshotsOperationDividerItem {
  type: 'divider';
  key?: string;
  position?: ScreenshotsOperationPosition;
}

export interface ScreenshotsOperationButtonItem {
  type?: 'button';
  key: string;
  title: string;
  icon?: string;
  iconNode?: ReactNode;
  label?: string;
  checked?: boolean | ((context: ScreenshotsActionContext) => boolean);
  disabled?: boolean | ((context: ScreenshotsActionContext) => boolean);
  option?: ReactNode | ((context: ScreenshotsActionContext) => ReactNode);
  position?: ScreenshotsOperationPosition;
  render?: (context: ScreenshotsActionContext) => ReactNode;
  onClick?: (
    context: ScreenshotsActionContext,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => unknown;
}

export type ScreenshotsOperationItem =
  | ScreenshotsOperationButtonItem
  | ScreenshotsOperationDividerItem;
