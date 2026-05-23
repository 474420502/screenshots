import type { ComponentType, MouseEvent, ReactElement } from 'react';
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useBounds from '../hooks/useBounds';
import useStore from '../hooks/useStore';
import {
  type ResolvedOperationLayoutItem,
  resolveOperationLayout,
} from '../operationItems';
import { builtinOperationComponents } from '../operations';
import ScreenshotsButton from '../ScreenshotsButton';
import type {
  Bounds,
  Position,
  ScreenshotsActionContext,
  ScreenshotsOperationButtonItem,
} from '../types';
import './index.less';

export const ScreenshotsOperationsCtx = React.createContext<Bounds | null>(
  null,
);

type ResolvedOperationItem =
  | {
    type: 'builtin';
    key: string;
    Component: ComponentType;
  }
  | {
    type: 'divider';
    key: string;
  }
  | {
    type: 'custom';
    key: string;
    item: ScreenshotsOperationButtonItem;
  };

function resolveStateValue<T>(
  value: T | ((context: ScreenshotsActionContext) => T) | undefined,
  context: ScreenshotsActionContext,
): T | undefined {
  if (typeof value === 'function') {
    return (value as (context: ScreenshotsActionContext) => T)(context);
  }
  return value;
}

function ScreenshotsCustomOperation({
  item,
}: {
  item: ScreenshotsOperationButtonItem;
}): ReactElement {
  const { actionContext } = useStore();

  const onClick = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      actionContext.emit('extensionOperation', {
        key: item.key,
        bounds: actionContext.getSnapshot().bounds,
      });
      try {
        Promise.resolve(item.onClick?.(actionContext, e)).catch((error) => {
          actionContext.emit('error', {
            error,
            source: `operation:${item.key}`,
          });
        });
      } catch (error) {
        actionContext.emit('error', {
          error,
          source: `operation:${item.key}`,
        });
      }
    },
    [actionContext, item],
  );

  if (item.render) {
    return <>{item.render(actionContext)}</>;
  }

  return (
    <ScreenshotsButton
      title={item.title}
      icon={item.icon}
      iconSvg={item.iconSvg}
      iconNode={item.iconNode}
      label={item.label}
      checked={resolveStateValue(item.checked, actionContext)}
      disabled={resolveStateValue(item.disabled, actionContext)}
      option={resolveStateValue(item.option, actionContext)}
      onClick={onClick}
    />
  );
}

function mapResolvedOperationItems(
  items: ResolvedOperationLayoutItem[],
): ResolvedOperationItem[] {
  return items.map((item) => {
    if (item.type === 'builtin') {
      return {
        type: 'builtin',
        key: item.key,
        Component: builtinOperationComponents[item.key],
      };
    }

    if (item.type === 'divider') {
      return item;
    }

    return item;
  });
}

export default memo(function ScreenshotsOperations(): ReactElement | null {
  const { actionContext, width, height, operationItems } = useStore();
  const [bounds] = useBounds();
  const [operationsRect, setOperationsRect] = useState<Bounds | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const validationSignatureRef = useRef('');
  const resolvedOperationState = useMemo(
    () => resolveOperationLayout(operationItems),
    [operationItems],
  );
  const resolvedOperationItems = useMemo(
    () => mapResolvedOperationItems(resolvedOperationState.items),
    [resolvedOperationState.items],
  );

  const elRef = useRef<HTMLDivElement>(null);
  const onDoubleClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);

  const onContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  useEffect(() => {
    if (!resolvedOperationState.errors.length) {
      validationSignatureRef.current = '';
      return;
    }

    const signature = resolvedOperationState.errors
      .map((error) => `${error.code}:${error.key ?? ''}:${error.anchor ?? ''}`)
      .join('|');

    if (validationSignatureRef.current === signature) {
      return;
    }

    validationSignatureRef.current = signature;

    resolvedOperationState.errors.forEach((error) => {
      console.warn(`[screenshots] ${error.message}`);
      actionContext.emit('error', {
        error: new Error(error.message),
        source: 'operationItems',
      });
    });
  }, [actionContext, resolvedOperationState.errors]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!bounds || !elRef.current) {
      return;
    }

    const elRect = elRef.current.getBoundingClientRect();

    let x = bounds.x + bounds.width - elRect.width;
    let y = bounds.y + bounds.height + 10;

    if (x < 0) {
      x = 0;
    }

    if (x > width - elRect.width) {
      x = width - elRect.width;
    }

    if (y > height - elRect.height) {
      y = height - elRect.height - 10;
    }

    // 小数存在精度问题
    if (
      !position ||
      Math.abs(position.x - x) > 1 ||
      Math.abs(position.y - y) > 1
    ) {
      setPosition({
        x,
        y,
      });
    }

    // 小数存在精度问题
    if (
      !operationsRect ||
      Math.abs(operationsRect.x - elRect.x) > 1 ||
      Math.abs(operationsRect.y - elRect.y) > 1 ||
      Math.abs(operationsRect.width - elRect.width) > 1 ||
      Math.abs(operationsRect.height - elRect.height) > 1
    ) {
      setOperationsRect({
        x: elRect.x,
        y: elRect.y,
        width: elRect.width,
        height: elRect.height,
      });
    }
  });

  if (!bounds) {
    return null;
  }

  return (
    <ScreenshotsOperationsCtx.Provider value={operationsRect}>
      <div
        ref={elRef}
        className="screenshots-operations"
        style={{
          visibility: position ? 'visible' : 'hidden',
          transform: `translate(${position?.x ?? 0}px, ${position?.y ?? 0}px)`,
        }}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      >
        <div className="screenshots-operations-buttons">
          {resolvedOperationItems.map((operationItem) => {
            if (operationItem.type === 'divider') {
              return (
                <div
                  key={operationItem.key}
                  className="screenshots-operations-divider"
                />
              );
            }

            if (operationItem.type === 'custom') {
              return (
                <ScreenshotsCustomOperation
                  key={operationItem.key}
                  item={operationItem.item}
                />
              );
            }

            const OperationButton = operationItem.Component;
            return <OperationButton key={operationItem.key} />;
          })}
        </div>
      </div>
    </ScreenshotsOperationsCtx.Provider>
  );
});
