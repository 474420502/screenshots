import { useCallback } from 'react';
import useDispatcher from './useDispatcher';
import useStore from './useStore';

export interface OperationDispatcher {
  set: (operation: string) => void;
  reset: () => void;
}

export type OperationValueDispatcher = [
  string | undefined,
  OperationDispatcher,
];

export default function useOperation(): OperationValueDispatcher {
  const { operation } = useStore();
  const { emitEvent, setOperation } = useDispatcher();

  const set = useCallback(
    (nextOperation: string) => {
      setOperation?.(nextOperation);
      emitEvent?.('operationChange', {
        operation: nextOperation,
        previousOperation: operation,
      });
    },
    [operation, setOperation, emitEvent],
  );

  const reset = useCallback(() => {
    setOperation?.(undefined);
    emitEvent?.('operationChange', {
      operation: undefined,
      previousOperation: operation,
    });
  }, [operation, setOperation, emitEvent]);

  return [
    operation,
    {
      set,
      reset,
    },
  ];
}
