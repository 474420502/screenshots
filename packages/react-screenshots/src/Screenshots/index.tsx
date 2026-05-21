import type { MouseEvent, ReactElement } from 'react';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import composeImage from './composeImage';
import './icons/iconfont.less';
import './screenshots.less';
import ScreenshotsBackground from './ScreenshotsBackground';
import ScreenshotsCanvas from './ScreenshotsCanvas';
import ScreenshotsContext from './ScreenshotsContext';
import ScreenshotsOperations from './ScreenshotsOperations';
import type {
  Bounds,
  Emitter,
  History,
  ScreenshotsActionContext,
  ScreenshotsEvent,
  ScreenshotsEventName,
  ScreenshotsEventPayloadMap,
  ScreenshotsOperationItem,
  ScreenshotsStateSnapshot,
} from './types';
import useGetLoadedImage from './useGetLoadedImage';
import type { Lang } from './zh_CN';
import zhCN from './zh_CN';

const legacyCallbackNames = new Set(['onSave', 'onOk', 'onCancel', 'onError']);

function getEventCallbackName(name: string): string {
  return `on${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

export interface ScreenshotsProps {
  url?: string;
  width: number;
  height: number;
  lang?: Partial<Lang>;
  className?: string;
  onSave?: (blob: Blob | null, bounds: Bounds) => void;
  onCancel?: () => void;
  onOk?: (blob: Blob | null, bounds: Bounds) => void;
  onEvent?: (event: ScreenshotsEvent) => void;
  onError?: (error: unknown, event?: ScreenshotsEvent<'error'>) => void;
  operationItems?: ScreenshotsOperationItem[];
  extraOperationItems?: ScreenshotsOperationItem[];
  [key: string]: unknown;
}

export default function Screenshots({
  url,
  width,
  height,
  lang,
  className,
  operationItems,
  extraOperationItems,
  ...props
}: ScreenshotsProps): ReactElement {
  const propsRef = useRef(props);
  propsRef.current = props;
  const image = useGetLoadedImage(url);
  const canvasContextRef = useRef<CanvasRenderingContext2D>(null);
  const emitterRef = useRef<Emitter>({});
  const [history, setHistory] = useState<History>({
    index: -1,
    stack: [],
  });
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [cursor, setCursor] = useState<string | undefined>('move');
  const [operation, setOperation] = useState<string | undefined>(undefined);
  const resolvedOperationItems = useMemo(
    () => [...(operationItems ?? []), ...(extraOperationItems ?? [])],
    [operationItems, extraOperationItems],
  );

  const call = useCallback(
    <T extends unknown[]>(funcName: string, ...args: T) => {
      const func = propsRef.current[funcName];
      if (typeof func === 'function') {
        func(...args);
      }
    },
    [],
  );

  const getSnapshot = useCallback(
    (): ScreenshotsStateSnapshot => ({
      url,
      width,
      height,
      image,
      bounds,
      cursor,
      operation,
      history,
    }),
    [url, width, height, image, bounds, cursor, operation, history],
  );

  const emitEvent = useCallback(
    <Name extends ScreenshotsEventName>(
      name: Name,
      payload?: ScreenshotsEventPayloadMap[Name],
    ) => {
      const event = {
        name,
        payload,
        snapshot: getSnapshot(),
      } as ScreenshotsEvent<Name>;
      call('onEvent', event);

      const callbackName = getEventCallbackName(name);
      if (!legacyCallbackNames.has(callbackName)) {
        call(callbackName, event);
      }

      if (name === 'error') {
        call(
          'onError',
          (payload as ScreenshotsEventPayloadMap['error'] | undefined)?.error,
          event,
        );
      }
    },
    [call, getSnapshot],
  );

  const compose = useCallback(
    async (targetBounds?: Bounds): Promise<Blob | null> => {
      const composeBounds = targetBounds ?? bounds;
      if (!image || !composeBounds) {
        return null;
      }

      try {
        return await composeImage({
          image,
          width,
          height,
          history,
          bounds: composeBounds,
        });
      } catch (error) {
        emitEvent('error', { error, source: 'compose' });
        return null;
      }
    },
    [image, bounds, width, height, history, emitEvent],
  );

  const reset = useCallback(
    (source?: string) => {
      emitterRef.current = {};
      setHistory({
        index: -1,
        stack: [],
      });
      setBounds(null);
      setCursor('move');
      setOperation(undefined);
      emitEvent('reset', { source });
    },
    [emitEvent],
  );

  const actionContext = useMemo<ScreenshotsActionContext>(
    () => ({
      getSnapshot,
      compose,
      reset,
      emit: emitEvent,
      setBounds,
      setOperation: (targetOperation?: string) => {
        const previousOperation = getSnapshot().operation;
        setOperation(targetOperation);
        emitEvent('operationChange', {
          operation: targetOperation,
          previousOperation,
        });
      },
    }),
    [getSnapshot, compose, reset, emitEvent],
  );

  const store = {
    url,
    width,
    height,
    image,
    lang: {
      ...zhCN,
      ...lang,
    },
    emitterRef,
    canvasContextRef,
    history,
    bounds,
    cursor,
    operation,
    operationItems: resolvedOperationItems,
    actionContext,
  };

  const dispatcher = {
    call,
    emitEvent,
    setHistory,
    setBounds,
    setCursor,
    setOperation,
  };

  const classNames = ['screenshots'];

  if (className) {
    classNames.push(className);
  }

  const onDoubleClick = useCallback(
    async (e: MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0 || !image) {
        return;
      }
      const targetBounds = bounds ?? {
        x: 0,
        y: 0,
        width,
        height,
      };
      emitEvent('beforeOk', { bounds: targetBounds, source: 'doubleClick' });
      const blob = await compose(targetBounds);
      emitEvent('ok', { blob, bounds: targetBounds, source: 'doubleClick' });
      call('onOk', blob, targetBounds);
      reset('ok');
    },
    [image, bounds, width, height, emitEvent, compose, call, reset],
  );

  const onContextMenu = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (e.button !== 2) {
        return;
      }
      e.preventDefault();
      emitEvent('cancel', { source: 'contextMenu' });
      call('onCancel');
      reset('cancel');
    },
    [call, emitEvent, reset],
  );

  // url变化，重置截图区域
  // biome-ignore lint/correctness/useExhaustiveDependencies: useLayoutEffect only cares about url
  useLayoutEffect(() => {
    reset('url');
  }, [url]);

  useLayoutEffect(() => {
    if (image) {
      emitEvent('captureReady', getSnapshot());
    }
  }, [image, emitEvent, getSnapshot]);

  return (
    <ScreenshotsContext.Provider value={{ store, dispatcher }}>
      <div
        className={classNames.join(' ')}
        style={{ width, height }}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      >
        <ScreenshotsBackground />
        <ScreenshotsCanvas ref={canvasContextRef} />
        <ScreenshotsOperations />
      </div>
    </ScreenshotsContext.Provider>
  );
}
