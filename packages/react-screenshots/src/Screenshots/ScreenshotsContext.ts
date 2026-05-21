import type { Dispatch, SetStateAction } from 'react';
import React from 'react';
import type {
  Bounds,
  CanvasContextRef,
  EmitterRef,
  History,
  ScreenshotsActionContext,
  ScreenshotsEventDispatcher,
  ScreenshotsOperationItem,
} from './types';
import type { Lang } from './zh_CN';
import zhCN from './zh_CN';

export interface ScreenshotsContextStore {
  url?: string;
  image: HTMLImageElement | null;
  width: number;
  height: number;
  lang: Lang;
  emitterRef: EmitterRef;
  canvasContextRef: CanvasContextRef;
  history: History;
  bounds: Bounds | null;
  cursor?: string;
  operation?: string;
  operationItems: ScreenshotsOperationItem[];
  actionContext: ScreenshotsActionContext;
}

export interface ScreenshotsContextDispatcher {
  call?: <T>(funcName: string, ...args: T[]) => void;
  emitEvent?: ScreenshotsEventDispatcher;
  setHistory?: Dispatch<SetStateAction<History>>;
  setBounds?: Dispatch<SetStateAction<Bounds | null>>;
  setCursor?: Dispatch<SetStateAction<string | undefined>>;
  setOperation?: Dispatch<SetStateAction<string | undefined>>;
}

export interface ScreenshotsContextValue {
  store: ScreenshotsContextStore;
  dispatcher: ScreenshotsContextDispatcher;
}

export default React.createContext<ScreenshotsContextValue>({
  store: {
    url: undefined,
    image: null,
    width: 0,
    height: 0,
    lang: zhCN,
    emitterRef: { current: {} },
    canvasContextRef: { current: null },
    history: {
      index: -1,
      stack: [],
    },
    bounds: null,
    cursor: 'move',
    operation: undefined,
    operationItems: [],
    actionContext: {
      getSnapshot: () => ({
        url: undefined,
        image: null,
        width: 0,
        height: 0,
        bounds: null,
        cursor: 'move',
        operation: undefined,
        history: {
          index: -1,
          stack: [],
        },
      }),
      compose: async () => null,
      reset: () => undefined,
      emit: () => undefined,
      setBounds: () => undefined,
      setOperation: () => undefined,
    },
  },
  dispatcher: {
    call: undefined,
    emitEvent: undefined,
    setHistory: undefined,
    setBounds: undefined,
    setCursor: undefined,
    setOperation: undefined,
  },
});
