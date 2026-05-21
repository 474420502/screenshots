import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Screenshots from '../Screenshots';
import type {
  Bounds,
  ScreenshotsEvent,
  ScreenshotsEventPayloadMap,
  ScreenshotsOperationItem,
  ScreenshotsOperationPosition,
  ScreenshotsStateSnapshot,
} from '../Screenshots/types';
import { HistoryItemType } from '../Screenshots/types';
import type { Lang } from '../Screenshots/zh_CN';
import './app.less';

export interface Display {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElectronScreenshotsOperationItem {
  key: string;
  title: string;
  icon?: string;
  label?: string;
  checked?: boolean;
  disabled?: boolean;
  position?: ScreenshotsOperationPosition;
  includeImage?: boolean;
}

function serializeSnapshot(snapshot: ScreenshotsStateSnapshot) {
  const top = snapshot.history.stack[snapshot.history.index];

  return {
    url: snapshot.url,
    width: snapshot.width,
    height: snapshot.height,
    bounds: snapshot.bounds,
    cursor: snapshot.cursor,
    operation: snapshot.operation,
    history: {
      index: snapshot.history.index,
      stackLength: snapshot.history.stack.length,
      top: top
        ? {
          type: top.type,
          name:
            top.type === HistoryItemType.Source ? top.name : top.source.name,
        }
        : null,
    },
  };
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return error;
}

function serializePayload(event: ScreenshotsEvent): unknown {
  switch (event.name) {
    case 'pointerDown':
    case 'pointerMove':
    case 'pointerUp': {
      const payload = event.payload as
        | ScreenshotsEventPayloadMap['pointerDown']
        | undefined;
      return payload ? { point: payload.point } : undefined;
    }
    case 'drawSelect': {
      const payload = event.payload as
        | ScreenshotsEventPayloadMap['drawSelect']
        | undefined;
      return payload ? { actionName: payload.action.name } : undefined;
    }
    case 'historyChange': {
      const payload = event.payload as
        | ScreenshotsEventPayloadMap['historyChange']
        | undefined;
      return payload
        ? {
          action: payload.action,
          history: {
            index: payload.history.index,
            stackLength: payload.history.stack.length,
          },
        }
        : undefined;
    }
    case 'error': {
      const payload = event.payload as
        | ScreenshotsEventPayloadMap['error']
        | undefined;
      return payload
        ? {
          source: payload.source,
          error: serializeError(payload.error),
        }
        : undefined;
    }
    case 'captureReady':
      return serializeSnapshot(event.snapshot);
    default:
      return event.payload;
  }
}

export default function App(): ReactElement {
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [width, setWidth] = useState(window.innerWidth);
  const [height, setHeight] = useState(window.innerHeight);
  const [display, setDisplay] = useState<Display | undefined>(undefined);
  const [lang, setLang] = useState<Lang | undefined>(undefined);
  const [operationItems, setOperationItems] = useState<
    ElectronScreenshotsOperationItem[]
  >([]);

  const onSave = useCallback(
    async (blob: Blob | null, bounds: Bounds) => {
      if (!display || !blob) {
        return;
      }
      window.screenshots.save(await blob.arrayBuffer(), { bounds, display });
    },
    [display],
  );

  const onCancel = useCallback(() => {
    window.screenshots.cancel();
  }, []);

  const onOk = useCallback(
    async (blob: Blob | null, bounds: Bounds) => {
      if (!display || !blob) {
        return;
      }
      window.screenshots.ok(await blob.arrayBuffer(), { bounds, display });
    },
    [display],
  );

  const onEvent = useCallback(
    (event: ScreenshotsEvent) => {
      if (!display) {
        return;
      }

      window.screenshots.event({
        name: event.name,
        payload: serializePayload(event),
        snapshot: serializeSnapshot(event.snapshot),
        display,
      });
    },
    [display],
  );

  const reactOperationItems = useMemo<ScreenshotsOperationItem[]>(
    () =>
      operationItems.map((operationItem) => ({
        key: operationItem.key,
        title: operationItem.title,
        icon: operationItem.icon,
        label: operationItem.label,
        checked: operationItem.checked,
        position: operationItem.position,
        disabled: !display || operationItem.disabled,
        onClick: async (context) => {
          if (!display) {
            return;
          }

          const { bounds } = context.getSnapshot();
          let arrayBuffer: ArrayBuffer | null = null;
          if (operationItem.includeImage !== false && bounds) {
            const blob = await context.compose(bounds);
            if (blob) {
              arrayBuffer = await blob.arrayBuffer();
            }
          }

          window.screenshots.extensionOperation(arrayBuffer, {
            key: operationItem.key,
            bounds,
            display,
          });
        },
      })),
    [operationItems, display],
  );

  useEffect(() => {
    const onSetLang = (lang: Lang) => {
      setLang(lang);
    };

    const onSetOperationItems = (items: ElectronScreenshotsOperationItem[]) => {
      setOperationItems(items ?? []);
    };

    const onCapture = (display: Display, dataURL: string) => {
      setDisplay(display);
      setUrl(dataURL);
    };

    const onReset = () => {
      setUrl(undefined);
      setDisplay(undefined);
      // 确保截图区域被重置
      requestAnimationFrame(() => window.screenshots.reset());
    };

    window.screenshots.on('setLang', onSetLang);
    window.screenshots.on('setOperationItems', onSetOperationItems);
    window.screenshots.on('capture', onCapture);
    window.screenshots.on('reset', onReset);
    // 告诉主进程页面准备完成
    window.screenshots.ready();
    return () => {
      window.screenshots.off('capture', onCapture);
      window.screenshots.off('setLang', onSetLang);
      window.screenshots.off('setOperationItems', onSetOperationItems);
      window.screenshots.off('reset', onReset);
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="body">
      <Screenshots
        url={url}
        width={width}
        height={height}
        lang={lang}
        onSave={onSave}
        onCancel={onCancel}
        onOk={onOk}
        onEvent={onEvent}
        operationItems={reactOperationItems}
      />
    </div>
  );
}
