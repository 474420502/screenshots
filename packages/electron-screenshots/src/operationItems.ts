export interface OperationItemWithKey {
  key: string;
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