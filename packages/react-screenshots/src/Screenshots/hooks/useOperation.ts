import { useCallback } from 'react';
import { setTrackedOperation } from '../stateTransitions';
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
      setTrackedOperation(
        {
          setOperation: (targetOperation) => {
            setOperation?.(targetOperation);
          },
          emitEvent,
        },
        operation,
        nextOperation,
      );
    },
    [operation, setOperation, emitEvent],
  );

  const reset = useCallback(() => {
    setTrackedOperation(
      {
        setOperation: (targetOperation) => {
          setOperation?.(targetOperation);
        },
        emitEvent,
      },
      operation,
      undefined,
    );
  }, [operation, setOperation, emitEvent]);

  return [
    operation,
    {
      set,
      reset,
    },
  ];
}
