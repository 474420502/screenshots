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
  builtinOperationComponents,
  defaultOperationLayout,
} from '../operations';
import ScreenshotsButton from '../ScreenshotsButton';
import type {
  Bounds,
  Position,
  ScreenshotsActionContext,
  ScreenshotsOperationButtonItem,
  ScreenshotsOperationDividerItem,
  ScreenshotsOperationItem,
  ScreenshotsOperationPosition,
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

function isDividerItem(
  item: ScreenshotsOperationItem,
): item is ScreenshotsOperationDividerItem {
  return item.type === 'divider';
}

function getPosition(
  item: ScreenshotsOperationItem,
): ScreenshotsOperationPosition {
  return item.position ?? 'before-confirm';
}

function findOperationIndex(
  items: ResolvedOperationItem[],
  key: string,
): number {
  return items.findIndex((item) => item.key === key);
}

function getInsertIndex(
  items: ResolvedOperationItem[],
  position: ScreenshotsOperationPosition,
): number {
  if (position === 'start') {
    return 0;
  }
  if (position === 'end') {
    return items.length;
  }
  if (position === 'before-history') {
    const index = findOperationIndex(items, 'Undo');
    return index === -1 ? items.length : index;
  }
  if (position === 'before-confirm') {
    const index = findOperationIndex(items, 'Save');
    return index === -1 ? items.length : index;
  }
  if ('before' in position) {
    const index = findOperationIndex(items, position.before);
    return index === -1 ? items.length : index;
  }
  if ('after' in position) {
    const index = findOperationIndex(items, position.after);
    return index === -1 ? items.length : index + 1;
  }
  return items.length;
}

function resolveOperationLayout(
  operationItems: ScreenshotsOperationItem[],
): ResolvedOperationItem[] {
  const items = defaultOperationLayout.map<ResolvedOperationItem>(
    (operation, index) => {
      if (operation === '|') {
        return {
          type: 'divider',
          key: `builtin-divider-${index}`,
        };
      }

      return {
        type: 'builtin',
        key: operation,
        Component: builtinOperationComponents[operation],
      };
    },
  );

  operationItems.forEach((operationItem, index) => {
    const position = getPosition(operationItem);
    const insertIndex = getInsertIndex(items, position);
    if (isDividerItem(operationItem)) {
      items.splice(insertIndex, 0, {
        type: 'divider',
        key: operationItem.key ?? `custom-divider-${index}`,
      });
      return;
    }

    items.splice(insertIndex, 0, {
      type: 'custom',
      key: operationItem.key,
      item: operationItem,
    });
  });

  return items;
}

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
      iconNode={item.iconNode}
      label={item.label}
      checked={resolveStateValue(item.checked, actionContext)}
      disabled={resolveStateValue(item.disabled, actionContext)}
      option={resolveStateValue(item.option, actionContext)}
      onClick={onClick}
    />
  );
}

export default memo(function ScreenshotsOperations(): ReactElement | null {
  const { width, height, operationItems } = useStore();
  const [bounds] = useBounds();
  const [operationsRect, setOperationsRect] = useState<Bounds | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const resolvedOperationItems = useMemo(
    () => resolveOperationLayout(operationItems),
    [operationItems],
  );

  const elRef = useRef<HTMLDivElement>(null);
  const onDoubleClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);

  const onContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

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
