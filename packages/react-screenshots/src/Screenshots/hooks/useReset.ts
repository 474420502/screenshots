import { useCallback } from 'react';
import useBounds from './useBounds';
import useCursor from './useCursor';
import useDispatcher from './useDispatcher';
import useEmitter from './useEmitter';
import useHistory from './useHistory';
import useOperation from './useOperation';

export type ResetDispatcher = (source?: string) => void;

export default function useReset(): ResetDispatcher {
  const { emitEvent } = useDispatcher();
  const emitter = useEmitter();
  const [, boundsDispatcher] = useBounds();
  const [, cursorDispatcher] = useCursor();
  const [, historyDispatcher] = useHistory();
  const [, operatioDispatcher] = useOperation();

  const reset = useCallback(
    (source?: string) => {
      emitter.reset();
      historyDispatcher.reset();
      boundsDispatcher.reset();
      cursorDispatcher.reset();
      operatioDispatcher.reset();
      emitEvent?.('reset', { source });
    },
    [
      emitEvent,
      emitter,
      historyDispatcher,
      boundsDispatcher,
      cursorDispatcher,
      operatioDispatcher,
    ],
  );

  return reset;
}
