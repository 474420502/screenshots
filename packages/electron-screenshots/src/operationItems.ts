export interface OperationItemWithKey {
  key: string;
}

export interface OperationItemWithHandler<THandler>
  extends OperationItemWithKey {
  handler?: THandler;
}

export interface OperationItemWithSelectionState
  extends OperationItemWithKey {
  disabled?: boolean;
  requiresSelection?: boolean;
}

export function mapOperationItemsForRenderer<
  T extends OperationItemWithHandler<unknown> & OperationItemWithSelectionState,
>(
  items: T[],
  options?: {
    hasSelection?: boolean;
  },
): Array<Omit<T, 'handler' | 'requiresSelection'>> {
  const hasSelection = options?.hasSelection ?? false;

  return items.map(({ handler: _handler, requiresSelection, disabled, ...item }) => {
    const nextItem = {
      ...item,
    } as Omit<T, 'handler' | 'requiresSelection'> & {
      disabled?: boolean;
    };

    if (typeof disabled !== 'undefined' || requiresSelection) {
      nextItem.disabled = Boolean(disabled || (requiresSelection && !hasSelection));
    }

    return nextItem as Omit<T, 'handler' | 'requiresSelection'>;
  });
}

export function getOperationItemHandlers<
  THandler,
  T extends OperationItemWithHandler<THandler>,
>(items: T[]): Map<string, THandler> {
  const handlers = new Map<string, THandler>();

  items.forEach((item) => {
    if (item.handler) {
      handlers.set(item.key, item.handler);
    }
  });

  return handlers;
}

export function updateOperationItem<T extends OperationItemWithKey>(
  items: T[],
  key: string,
  patch: Partial<Omit<T, 'key'>>,
): { items: T[]; updated: boolean } {
  const index = items.findIndex((item) => item.key === key);

  if (index === -1) {
    return {
      items,
      updated: false,
    };
  }

  const currentItem = items[index];

  if (!currentItem) {
    return {
      items,
      updated: false,
    };
  }

  const nextItems = [...items];
  nextItems[index] = {
    ...currentItem,
    ...patch,
    key: currentItem.key,
  } as T;

  return {
    items: nextItems,
    updated: true,
  };
}