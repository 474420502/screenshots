import type {
  ScreenshotsOperationButtonItem,
  ScreenshotsOperationDividerItem,
  ScreenshotsOperationItem,
  ScreenshotsOperationPosition,
} from './types';

export const builtinOperationKeys = [
  'Rectangle',
  'Ellipse',
  'Arrow',
  'Brush',
  'Text',
  'Mosaic',
  'Undo',
  'Redo',
  'Save',
  'Cancel',
  'Ok',
] as const;

export type BuiltinOperationKey = (typeof builtinOperationKeys)[number];

export type OperationLayoutItem = BuiltinOperationKey | '|';

export const defaultOperationLayout: OperationLayoutItem[] = [
  'Rectangle',
  'Ellipse',
  'Arrow',
  'Brush',
  'Text',
  'Mosaic',
  '|',
  'Undo',
  'Redo',
  '|',
  'Save',
  'Cancel',
  'Ok',
];

export type ResolvedOperationLayoutItem =
  | {
      type: 'builtin';
      key: BuiltinOperationKey;
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

export interface OperationItemValidationError {
  code: 'duplicate-key' | 'invalid-key' | 'missing-anchor';
  key?: string;
  anchor?: string;
  message: string;
}

export interface ResolvedOperationLayoutResult {
  items: ResolvedOperationLayoutItem[];
  validItems: ScreenshotsOperationItem[];
  errors: OperationItemValidationError[];
}

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

function createBaseOperationLayout(): ResolvedOperationLayoutItem[] {
  return defaultOperationLayout.map((operation, index) => {
    if (operation === '|') {
      return {
        type: 'divider' as const,
        key: `builtin-divider-${index}`,
      };
    }

    return {
      type: 'builtin' as const,
      key: operation,
    };
  });
}

function findOperationIndex(
  items: ResolvedOperationLayoutItem[],
  key: string,
): number {
  return items.findIndex((item) => item.key === key);
}

function getInsertIndex(
  items: ResolvedOperationLayoutItem[],
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

function getAnchorKey(
  position: ScreenshotsOperationPosition,
): string | undefined {
  if (typeof position === 'string') {
    return undefined;
  }
  if ('before' in position) {
    return position.before;
  }
  if ('after' in position) {
    return position.after;
  }
  return undefined;
}

function getResolvedKey(item: ScreenshotsOperationItem, index: number): string {
  if (isDividerItem(item)) {
    return item.key ?? `custom-divider-${index}`;
  }
  return item.key;
}

export function resolveOperationLayout(
  operationItems: ScreenshotsOperationItem[],
): ResolvedOperationLayoutResult {
  const items = createBaseOperationLayout();
  const validItems: ScreenshotsOperationItem[] = [];
  const errors: OperationItemValidationError[] = [];

  operationItems.forEach((operationItem, index) => {
    const key = getResolvedKey(operationItem, index);

    if (!key.trim()) {
      errors.push({
        code: 'invalid-key',
        message: 'Custom operation items must provide a non-empty key.',
      });
      return;
    }

    if (findOperationIndex(items, key) !== -1) {
      errors.push({
        code: 'duplicate-key',
        key,
        message: `Custom operation key "${key}" is duplicated or conflicts with a built-in operation.`,
      });
      return;
    }

    const position = getPosition(operationItem);
    const anchor = getAnchorKey(position);

    if (anchor && findOperationIndex(items, anchor) === -1) {
      errors.push({
        code: 'missing-anchor',
        key,
        anchor,
        message: `Custom operation key "${key}" references unknown anchor "${anchor}".`,
      });
      return;
    }

    const resolvedItem = isDividerItem(operationItem)
      ? {
          type: 'divider' as const,
          key,
        }
      : {
          type: 'custom' as const,
          key,
          item: operationItem,
        };

    items.splice(getInsertIndex(items, position), 0, resolvedItem);
    validItems.push(operationItem);
  });

  return {
    items,
    validItems,
    errors,
  };
}
