import type { Bounds, History, ScreenshotsEventDispatcher } from './types';

export function createEmptyHistory(): History {
  return {
    index: -1,
    stack: [],
  };
}

interface ResetHistoryStateOptions {
  setHistory: (history: History) => void;
  emitEvent?: ScreenshotsEventDispatcher;
}

export function resetHistoryState({
  setHistory,
  emitEvent,
}: ResetHistoryStateOptions): void {
  const history = createEmptyHistory();

  setHistory(history);
  emitEvent?.('historyChange', { action: 'reset', history });
}

interface SetTrackedOperationOptions {
  setOperation: (operation: string | undefined) => void;
  emitEvent?: ScreenshotsEventDispatcher;
}

export function setTrackedOperation(
  { setOperation, emitEvent }: SetTrackedOperationOptions,
  previousOperation: string | undefined,
  nextOperation: string | undefined,
): void {
  if (previousOperation === nextOperation) {
    return;
  }

  setOperation(nextOperation);
  emitEvent?.('operationChange', {
    operation: nextOperation,
    previousOperation,
  });
}

interface SetProgrammaticBoundsOptions {
  setBounds: (bounds: Bounds | null) => void;
  emitEvent?: ScreenshotsEventDispatcher;
}

export function setProgrammaticBounds(
  { setBounds, emitEvent }: SetProgrammaticBoundsOptions,
  bounds: Bounds | null,
): void {
  setBounds(bounds);

  if (bounds) {
    emitEvent?.('selectionChange', { bounds });
  } else {
    emitEvent?.('selectionEnd', { bounds: null });
  }
}

interface ResetScreenshotsStateOptions {
  resetEmitter: () => void;
  resetHistory: () => void;
  resetBounds: () => void;
  resetCursor: () => void;
  resetOperation: () => void;
  emitEvent?: ScreenshotsEventDispatcher;
}

export function resetScreenshotsState(
  {
    resetEmitter,
    resetHistory,
    resetBounds,
    resetCursor,
    resetOperation,
    emitEvent,
  }: ResetScreenshotsStateOptions,
  source?: string,
): void {
  resetEmitter();
  resetHistory();
  resetBounds();
  resetCursor();
  resetOperation();
  emitEvent?.('reset', { source });
}
